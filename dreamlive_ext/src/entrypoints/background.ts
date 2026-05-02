import { browser } from 'wxt/browser';
import { LeadsService } from '../features/operations/services/leads.service';
import { MessagingService } from '../features/operations/services/messaging.service';
import { BackstageService } from '../features/operations/services/backstage.service';
import { ExtensionMessage } from '../features/shared/types/messages';
import { apiClient } from '../infrastructure/api/apiClient';
import { SCRAPER_BATCH_SIZE } from '../features/shared/constants';

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
              // Extraer un lote de usuarios (leads por defecto según constante)
              const batchSize = (msg as any).batchSize || SCRAPER_BATCH_SIZE;
              const batch = leadsQueue.splice(0, batchSize);
              console.log(`[Background] GET_BATCH_TO_CHECK extrayendo lote de ${batch.length} leads. Quedan ${leadsQueue.length} en cola.`);
              sendResponse({ users: batch, totalRemaining: leadsQueue.length });
            } else {
              console.log('[Background] GET_BATCH_TO_CHECK: Cola de leads sigue vacía.');
              sendResponse({ users: [], totalRemaining: 0 });
            }
          } catch (error) {
            console.error('[Background] Error auto-populating batch leads from API:', error);
            sendResponse({ users: [], totalRemaining: 0 });
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

      case 'SAVE_MESSAGE_TEMPLATES':
        (async () => {
          try {
            const templates = (msg as any).message_templates;
            await apiClient.post('/licenses/templates', {
              message_templates: templates
            });
            console.log('✅ Plantillas de mensaje guardadas en API:', templates);
            sendResponse({ success: true });
          } catch (e) {
            console.error('Error guardando plantillas de mensaje en API:', e);
            sendResponse({ success: false });
          }
        })();
        return true;

      case 'GET_INVITATION_CONFIG':
        // El content script de backstage necesita la configuración de invitaciones y plantillas
        (async () => {
          try {
            const res = await apiClient.get<any>('/licenses/templates');
            if (res.data) {
              sendResponse({
                invitation_types: res.data.invitation_types || ["Normal", "Elite", "Popular", "Premium"],
                message_templates: res.data.message_templates || []
              });
              return;
            }
          } catch (e) {
            console.error('Error fetching invitation config:', e);
          }
          sendResponse({
            invitation_types: ["Normal", "Elite", "Popular", "Premium"],
            message_templates: []
          });
        })();
        return true;

      case 'BATCH_PROCESSED':
        // El content script de backstage terminó de procesar un lote
        if ('disponibles' in message && 'procesados' in message) {
          BackstageService.updateBatchResults(message.procesados, message.disponibles)
            .then(() => {
              console.log('✅ Batch actualizado en API.');
              sendResponse({ success: true });
            })
            .catch(err => {
              console.error(err);
              sendResponse({ success: false });
            });
          return true;
        }
        break;

      case 'LEAD_CONTACTED_SUCCESS':
      case 'MARK_CONTACTED':
        if ('username' in message) {
          (async () => {
            try {
              const { AuthService } = await import('../infrastructure/api/auth.service');
              const meRes = await AuthService.getMe();
              const license_id = meRes.data?.license_id;
              if (license_id) {
                await apiClient.patch('/leads/status', {
                  license_id,
                  username: message.username,
                  status: 'contactado'
                });
                console.log(`✅ Lead ${message.username} actualizado a 'contactado' en backend.`);
                sendResponse({ success: true });
              } else {
                console.warn('No active license_id found for current user.');
                sendResponse({ success: false, error: 'No active license' });
              }
            } catch (err) {
              console.error('Error in LEAD_CONTACTED_SUCCESS handler:', err);
              sendResponse({ success: false });
            }
          })();
          return true;
        }
        break;

      case 'DELETE_LEAD':
        if ('username' in message) {
          MessagingService.deleteLead(message.username)
            .then(() => sendResponse({ success: true }))
            .catch(err => {
              console.error(err);
              sendResponse({ success: false });
            });
          return true;
        }
        break;

      case 'NAVIGATE':
        if ('url' in msg) {
          browser.tabs.query({ active: true, currentWindow: true }).then(([tab]) => {
            if (tab && tab.id) {
              browser.tabs.update(tab.id, { url: msg.url });
              sendResponse({ success: true });
            } else {
              sendResponse({ success: false });
            }
          }).catch(err => {
            console.error(err);
            sendResponse({ success: false });
          });
          return true;
        }
        break;

      case 'START_CONTACTING':
        MessagingService.startContacting()
          .then(() => sendResponse({ success: true }))
          .catch(err => {
            console.error(err);
            sendResponse({ success: false });
          });
        return true;

      case 'STOP_CONTACTING':
        MessagingService.stopContacting()
          .then(() => sendResponse({ success: true }))
          .catch(err => {
            console.error(err);
            sendResponse({ success: false });
          });
        return true;

      case 'ABORT_CHECKING_FLOW':
        leadsQueue = [];
        console.log('[Background] ABORT_CHECKING_FLOW recibido. Se ha vaciado la cola de leads.');
        sendResponse({ success: true });
        return true;

      case 'GET_LEADS_FOR_CONTACTING':
        (async () => {
          try {
            const limitsRes = await apiClient.get<any>('/operations/limits');
            const restantes = limitsRes.data ? (limitsRes.data.limit - limitsRes.data.count) : 50;

            const leadsRes = await apiClient.get<any>('/leads?status=disponible&limit=40');
            const templatesRes = await apiClient.get<any>('/licenses/templates');

            sendResponse({
              success: true,
              leads: (leadsRes.data?.items || []).map((l: any) => l.username),
              templates: templatesRes.data?.message_templates || [],
              targetSuccessCount: restantes
            });
          } catch (e) {
            console.error(e);
            sendResponse({ success: false, error: String(e) });
          }
        })();
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
        sendResponse({ success: true });
        break;

      default:
        console.warn('Unknown message type received in background:', message);
        sendResponse({ success: false });
    }

    // Por defecto retornar false para cerrar el canal síncronamente
    return false;
  });
});
