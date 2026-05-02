import { browser } from 'wxt/browser';
import { LeadsService } from '../features/operations/services/leads.service';
import { MessagingService } from '../features/operations/services/messaging.service';
import { BackstageService } from '../features/operations/services/backstage.service';
import { ExtensionMessage } from '../features/shared/types/messages';
import { apiClient } from '../infrastructure/api/apiClient';

export default defineBackground(() => {
  console.log('🔥 DreamLive Background Controller Initialized.', { id: browser.runtime.id });

  // Cola de usuarios (leads) en memoria para el modelo PULL
  let leadsQueue: any[] = [];

  browser.runtime.onMessage.addListener((message: any, sender, sendResponse) => {
    const msg = message as ExtensionMessage;

    switch (msg.type) {
      // --- CAPTURA DE LEADS (DOM Scraping) ---
      case 'SAVE_LEAD':
        if ('username' in msg) {
          const getLicense = async () => {
            let license = await storage.getItem<any>('local:license');
            if (!license) {
              const res = await browser.storage.local.get('license');
              license = res.license as any;
            }
            return license;
          };

          getLicense().then((license: any) => {
            console.log('[Background] Intentando recuperar licencia:', license);
            if (license && license.id) {
              LeadsService.saveLead({ ...msg, license_id: license.id }).catch(err => {
                console.error('[Background] Error al guardar lead:', err);
              });
            } else {
              console.warn('[Background] No se pudo guardar el lead: No hay licencia activa en el storage.', { license });
            }
          });
        }
        break;

      case 'START_CHECKING_FLOW':
        if ('leads' in msg && Array.isArray(msg.leads)) {
          leadsQueue = [...msg.leads];
          console.log(`[Background] START_CHECKING_FLOW recibido. Cola inicializada con ${leadsQueue.length} leads.`);
          sendResponse({ success: true, count: leadsQueue.length });
        } else {
          console.warn('[Background] Recibido START_CHECKING_FLOW sin array de leads.');
          sendResponse({ success: false, error: 'Se requiere un array de leads.' });
        }
        return true;

      case 'GET_BATCH_TO_CHECK':
        // El scraper solicita un nuevo lote por modelo PULL
        (async () => {
          try {
            if (leadsQueue.length === 0) {
              console.log('[Background] Cola de leads vacía. Auto-poblando desde la API...');
              const res = await apiClient.get<any>('/leads/?status=recopilado&page=1&page_size=100');
              if (res && res.data && res.data.items) {
                const fetchedLeads = res.data.items.map((item: any) => item.username);
                leadsQueue = [...fetchedLeads];
                console.log(`[Background] Auto-población completa con ${leadsQueue.length} leads desde la API.`);
              }
            }

            if (leadsQueue.length > 0) {
              // Extraer un lote de usuarios (ej. 15 leads por defecto)
              const batchSize = (msg as any).batchSize || 15;
              const batch = leadsQueue.splice(0, batchSize);
              console.log(`[Background] GET_BATCH_TO_CHECK extrayendo lote de ${batch.length} leads. Quedan ${leadsQueue.length} en cola.`);
              sendResponse({ users: batch });
            } else {
              console.log('[Background] GET_BATCH_TO_CHECK: Cola de leads sigue vacía.');
              sendResponse({ users: [] });
            }
          } catch (error) {
            console.error('[Background] Error auto-populating batch leads from API:', error);
            sendResponse({ users: [] });
          }
        })();
        return true; // Mantener canal abierto para respuesta asíncrona

      case 'SAVE_INVITATION_CONFIG':
        // Guardar la selección múltiple en la base de datos
        (async () => {
          try {
            const tags = (msg as any).invitation_types;
            await apiClient.post('/licenses/templates', {
              invitation_types: tags
            });
            console.log('✅ Configuración de etiquetas guardada:', tags);
            sendResponse({ success: true });
          } catch (e) {
            console.error('Error guardando config de invitación:', e);
            sendResponse({ success: false });
          }
        })();
        return true;

      case 'GET_INVITATION_CONFIG':
        // El content script de backstage necesita la configuración de invitaciones
        (async () => {
          try {
            const res = await apiClient.get<any>('/licenses/templates');
            if (res.data && res.data.invitation_types) {
              sendResponse({ invitation_types: res.data.invitation_types });
              return;
            }
          } catch (e) {
            console.error('Error fetching invitation config:', e);
          }
          sendResponse({ invitation_types: ["Normal", "Elite", "Popular", "Premium"] });
        })();
        return true;

      case 'BATCH_PROCESSED':
        // El content script de backstage terminó de procesar un lote
        if ('disponibles' in message && 'procesados' in message) {
          BackstageService.updateBatchResults(message.procesados, message.disponibles)
            .then(() => {
              console.log('✅ Batch actualizado en API.');
            })
            .catch(console.error);
        }
        break;

      case 'MARK_CONTACTED':
        if ('username' in message) {
          MessagingService.markAsContacted(message.username).catch(console.error);
        }
        break;

      case 'DELETE_LEAD':
        if ('username' in message) {
          MessagingService.deleteLead(message.username).catch(console.error);
        }
        break;

      case 'NAVIGATE':
        if ('url' in msg) {
          browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            if (tab && tab.id) {
              browser.tabs.update(tab.id, { url: msg.url });
            }
          });
        }
        break;

      case 'ABORT_CHECKING_FLOW':
        leadsQueue = [];
        console.log('[Background] ABORT_CHECKING_FLOW recibido. Se ha vaciado la cola de leads.');
        sendResponse({ success: true });
        return true;

      case 'BACKSTAGE_SCRIPT_READY':
      case 'MESSAGES_PAGE_READY':
      case 'toggleRecopilacion':
      case 'LEAD_SAVED_CONFIRMATION':
      case 'ROTATE_KEYWORD':
      case 'COLLECTION_STOPPED':
      case 'STOP_CHECKING_UI':
      case 'BACKSTAGE_ALL_DONE':
      case 'CHECK_BATCH_ON_PAGE':
      case 'PROCESS_CONTACT_FLOW':
      case 'ABORT_CONTACT_FLOW':
      case 'LIMIT_REACHED':
        // Estos mensajes usualmente viajan entre el popup y el content script directamente, 
        // o son broadcasts a los que la UI se suscribe.
        break;

      default:
        console.warn('Unknown message type received in background:', message);
    }

    // Indica que sendResponse se llamará de forma asíncrona si es necesario
    return true;
  });
});
