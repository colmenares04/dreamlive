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
  let totalRemainingInDb = 0;
  let isFetchingLeads = false;

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
            // Si la cola está vacía y no estamos buscando, buscamos
            if (leadsQueue.length === 0 && !isFetchingLeads) {
              isFetchingLeads = true;
              console.log('[Background] Cola de leads vacía. Auto-poblando desde la API...');
              const res = await apiClient.get<any>('/leads/?status=recopilado&page=1&page_size=100');
              if (res && res.data && res.data.items) {
                const fetchedLeads = res.data.items.map((item: any) => item.username);
                leadsQueue = [...fetchedLeads];
                totalRemainingInDb = res.data.total || 0;
                console.log(`[Background] Auto-población completa con ${leadsQueue.length} leads desde la API. Total en DB: ${totalRemainingInDb}`);
              }
              isFetchingLeads = false;
            }

            if (leadsQueue.length > 0) {
              const batchSize = (msg as any).batchSize || SCRAPER_BATCH_SIZE;
              const batch = leadsQueue.splice(0, batchSize);
              
              // Si nos quedan pocos después de este splice, lanzamos un pre-fetch asíncrono para el siguiente
              if (leadsQueue.length < batchSize && !isFetchingLeads) {
                isFetchingLeads = true;
                apiClient.get<any>('/leads/?status=recopilado&page=1&page_size=100').then(res => {
                  if (res && res.data && res.data.items) {
                    const fetchedLeads = res.data.items.map((item: any) => item.username)
                      .filter((u: string) => !batch.includes(u)); // Evitar duplicados inmediatos
                    leadsQueue = [...leadsQueue, ...fetchedLeads];
                    totalRemainingInDb = res.data.total || 0;
                    console.log(`[Background] Pre-fetch completado. Nueva cola: ${leadsQueue.length}. Total DB: ${totalRemainingInDb}`);
                  }
                  isFetchingLeads = false;
                }).catch(e => {
                  console.error('[Background] Error en pre-fetch:', e);
                  isFetchingLeads = false;
                });
              }

              console.log(`[Background] GET_BATCH_TO_CHECK enviando ${batch.length} leads. Quedan ${leadsQueue.length} en cola local. DB dice total: ${totalRemainingInDb}`);
              sendResponse({ 
                users: batch, 
                totalRemaining: leadsQueue.length,
                totalInDb: totalRemainingInDb 
              });
            } else {
              console.log('[Background] GET_BATCH_TO_CHECK: Cola vacía y nada más en DB.');
              sendResponse({ users: [], totalRemaining: 0, totalInDb: 0 });
            }
          } catch (error) {
            console.error('[Background] Error in GET_BATCH_TO_CHECK:', error);
            isFetchingLeads = false;
            sendResponse({ users: [], totalRemaining: 0, totalInDb: 0 });
          }
        })();
        return true;

      case 'SAVE_INVITATION_CONFIG':
        (async () => {
          try {
            const tags = (msg as any).invitation_types;
            const res = await apiClient.post('/licenses/templates', {
              invitation_types: tags
            });
            if (res.error) {
              throw new Error(`API Error (${res.status}): ${res.error}`);
            }
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
            const invitation_types = (msg as any).invitation_types;
            const res = await apiClient.post('/licenses/templates', {
              message_templates: templates,
              invitation_types: invitation_types
            });
            
            if (res.error) {
              throw new Error(`API Error (${res.status}): ${res.error}`);
            }

            console.log('✅ Configuración de licencia guardada en API:', { templates, invitation_types });
            sendResponse({ success: true });
          } catch (e) {
            console.error('Error guardando configuración de licencia en API:', e);
            sendResponse({ success: false });
          }
        })();
        return true;

      case 'GET_INVITATION_CONFIG':
        (async () => {
          try {
            const res = await apiClient.get<any>('/licenses/templates');
            if (res.data) {
              console.log('[Background] Configuración recuperada:', res.data);
              sendResponse({
                invitation_types: res.data.invitation_types || ["Normal", "Elite", "Popular", "Premium"],
                message_templates: res.data.message_templates || [],
                request_limit: res.data.request_limit || 60,
                refresh_minutes: res.data.refresh_minutes || 60
              });
              return;
            }
            if (res.error) {
              console.warn(`[Background] Error recuperando config (${res.status}):`, res.error);
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

      case 'GET_LIMITS':
        (async () => {
          try {
            const res = await apiClient.get<any>('/operations/limits');
            if (res.data) {
              sendResponse({
                success: true,
                count: res.data.count,
                limit: res.data.limit,
                reset_in: res.data.reset_in
              });
              return;
            }
          } catch (e) {
            console.error('[Background] Error in GET_LIMITS:', e);
          }
          sendResponse({ success: false });
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
              const username = message.username.replace('@', '');
              
              // Broadcast interno para actualización en vivo de la UI (Extension context y Content Scripts)
              const broadcastMsg = { 
                type: message.type, 
                username: username,
                internalBroadcast: true 
              };
              
              // Enviar a la UI de la extensión (Dashboard)
              browser.runtime.sendMessage(broadcastMsg).catch(() => {});
              
              // Enviar a todas las pestañas (ContactModal en TikTok)
              browser.tabs.query({}).then(tabs => {
                tabs.forEach(tab => {
                  if (tab.id) browser.tabs.sendMessage(tab.id, broadcastMsg).catch(() => {});
                });
              });

              console.log(`[Background] Guardando estado 'contactado' para: ${username}`);
              const res = await apiClient.patch('/leads/status', {
                usernames: [username],
                status: 'contactado'
              });
              
              if (res && res.error) {
                console.error('[Background] Error en PATCH lead status:', res.error, res.status);
                sendResponse({ success: false, error: res.error, status: res.status });
              } else {
                console.log(`✅ Lead ${username} actualizado exitosamente.`);
                sendResponse({ success: true });
              }
            } catch (err: any) {
              console.error('[Background] Error crítico en LEAD_CONTACTED_SUCCESS:', err);
              sendResponse({ success: false, error: err.message || 'Error desconocido' });
            }
          })();
          return true;
        }
        break;

      case 'DELETE_LEAD':
        if ('username' in message) {
          const username = message.username.replace('@', '');
          MessagingService.deleteLead(username)
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
              targetSuccessCount: restantes,
              totalInDb: leadsRes.data?.total || 0
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
      case 'KEYWORDS_UPDATED':
      case 'KEYWORD_CHANGED':
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
