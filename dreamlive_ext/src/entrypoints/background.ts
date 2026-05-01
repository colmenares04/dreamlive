import { browser } from 'wxt/browser';
import { LeadsService } from '../features/operations/services/leads.service';
import { MessagingService } from '../features/operations/services/messaging.service';
import { BackstageService } from '../features/operations/services/backstage.service';
import { ExtensionMessage } from '../features/shared/types/messages';
import { apiClient } from '../infrastructure/api/apiClient';

export default defineBackground(() => {
  console.log('🔥 DreamLive Background Controller Initialized.', { id: browser.runtime.id });

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

      case 'GET_BATCH_TO_CHECK':
        // El scraper solicita un nuevo lote
        (async () => {
          try {
            const users = await BackstageService.fetchBatchLeads(undefined, 30);
            sendResponse({ users });
          } catch (error) {
            console.error('[Background] Error fetching batch leads:', error);
            sendResponse({ users: [] });
          }
        })();
        return true; // Mantener canal abierto

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

      // Eventos puramente de estado/UI que se manejan a nivel de extensión (popup -> content script)
      case 'toggleRecopilacion':
      case 'LEAD_SAVED_CONFIRMATION':
      case 'ROTATE_KEYWORD':
      case 'COLLECTION_STOPPED':
      case 'STOP_CHECKING_UI':
      case 'BACKSTAGE_ALL_DONE':
      case 'CHECK_BATCH_ON_PAGE':
      case 'PROCESS_CONTACT_FLOW':
      case 'ABORT_CONTACT_FLOW':
      case 'ABORT_CHECKING_FLOW':
      case 'LIMIT_REACHED':
        // Estos mensajes usualmente viajan entre el popup y el content script directamente, 
        // o son broadcasts a los que la UI se suscribe. El background no necesita procesarlos, 
        // pero podemos logearlos para debugging.
        // console.log('[Background] Evento UI/Estado detectado:', msg.type);
        break;

      default:
        console.warn('Unknown message type received in background:', message);
    }

    // Indica que sendResponse se llamará de forma asíncrona si es necesario
    return true;
  });
});
