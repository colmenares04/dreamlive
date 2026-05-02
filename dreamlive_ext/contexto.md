Contexto General: > Estamos trabajando en dreamlive_ext, la nueva extensión construida con WXT y React que reemplaza a una versión antigua. Esta extensión se comunica con un backend en FastAPI (dreamlive_api) y convive con una plataforma web (dreamlive_web).

Reglas de Oro del Proyecto (CERO EXCEPCIONES):

Respetar los Hacks del DOM: TikTok usa React ofuscado. Si hay métodos usando DomUtils.focusReal, setNativeValue, o fallbacks con Object.getOwnPropertyDescriptor, MANTENLOS INTACTOS. Las IAs tienden a borrarlos para "simplificar" el código usando .value = "", lo cual rompe la aplicación. ¡NO LO HAGAS!

Separación de Responsabilidades: La UI (Modales, React) no hace el trabajo pesado. Toda la lógica de manipulación del DOM y scrapers vive en clases de servicios dentro de src/features/operations/services/ (ej. AvailabilityScraperService).

Comunicación: Se usa browser.runtime.sendMessage de WXT para comunicarse entre el background y los content scripts.

[TAREA ACTUAL: MEJORA DEL COMPROBADOR DE DISPONIBILIDAD]

Objetivo: > Necesito actualizar el sistema de comprobación de disponibilidad (AvailabilityModal.tsx y availability-scraper.service.ts). Quiero que el flujo sea continuo, procesando lotes de 30 en 30 (antes era de 15), retrocediendo en la interfaz de TikTok entre lotes, y mostrando dos mediciones en el modal.

Requisitos para la UI (AvailabilityModal.tsx o similar):
El modal ahora debe mostrar visualmente DOS mediciones de progreso:

Progreso Total (Global): Muestra cuántos leads se han analizado del total de la lista recopilada (ej. Analizados: 60 / 150).

Progreso del Lote (En proceso): Muestra el estado del sub-lote actual que se pegó en el textarea (ej. Lote actual: 0 / 30).
Ajusta la interfaz ScraperCallbacks para que soporte enviar ambos progresos desde el servicio a React.

Requisitos para el Servicio (availability-scraper.service.ts):
Modifica la lógica del motor para que funcione exactamente con este ciclo:

Tamaño del Lote: Ajusta el corte del lote para que tome 30 usuarios a la vez.

El Ciclo de Procesamiento:

Pega los 30 usuarios en el <textarea data-testid="inviteHostTextArea">.

Hace clic en "Siguiente" (Next) y espera a que carguen los resultados.

Lee la tabla, extrae los disponibles y actualiza la medición total y parcial.

El Botón de Retroceso (CRÍTICO):

Si aún quedan leads por comprobar en la cola global, el bot DEBE hacer clic en el botón de "Atrás" de TikTok para regresar a la pantalla de búsqueda.

Selector exacto a usar: <button data-id="invite-host-back" class="semi-button semi-button-primary semi-button-light button_wrap-EJEp5p bk-button" type="button" aria-disabled="false"><span class="semi-button-content" x-semi-prop="children">Back</span></button>

Limpieza y Repetición:

Una vez retrocede, debe buscar el textarea nuevamente.

DEBE BORRAR el contenido anterior del textarea completamente.

Pega el siguiente lote de 30 y repite el ciclo hasta terminar toda la lista.

Entregable:
Muéstrame el código actualizado de:

La interfaz o tipos actualizados para los callbacks de progreso.

El AvailabilityModal.tsx con el diseño de doble barra de progreso/contador.

El availability-scraper.service.ts aplicando la lógica del botón Back, el cambio a 30 leads y la doble medición, respetando absolutamente las esperas (delays) y los retries para que TikTok no bloquee el bot.