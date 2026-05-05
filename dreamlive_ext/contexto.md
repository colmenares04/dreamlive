Contexto General: > Estamos trabajando en dreamlive_ext, la nueva extensión construida con WXT y React que reemplaza a una versión antigua. Esta extensión se comunica con un backend en FastAPI (dreamlive_api) y convive con una plataforma web (dreamlive_web).

Actúa como un Arquitecto de Software Senior especializado en Clean Code, TypeScript y Refactorización.

CONTEXTO:
Estamos optimizando nuestra extensión de navegador (dreamlive_ext). Quiero erradicar todos los "números mágicos" (magic numbers) y "cadenas mágicas" (magic strings) que están quemados (hardcodeados) en nuestros servicios y componentes. Ya tengo un archivo inicial src/features/shared/constants.ts donde guardamos variables globales como SCRAPER_BATCH_SIZE.

LA TAREA:
A continuación, te pasaré el código de uno o varios de mis servicios/componentes. Quiero que hagas una auditoría estricta y extraigas todos los valores literales repetitivos o de configuración y los muevas a constantes exportadas.

QUÉ DEBES EXTRAER EXACTAMENTE:

Eventos/Tipos de Mensajes: Cualquier string usado en runtime.sendMessage o addListener (ej. "GET_BATCH_TO_CHECK"). Agruparlos en un objeto constante (ej. export const MESSAGES = { GET_BATCH: "GET_BATCH", ... }).

Selectores del DOM: Todo lo que vaya dentro de un querySelector o querySelectorAll que pertenezca a la estructura externa de TikTok. Agruparlos en export let  DOM_SELECTORS = { TEXTAREA_SEARCH: "...", BACK_BUTTON: "..." }. Esto se emigrará luego a un servidor y por ahí adaptaremos eso, así que no lo pongas tan dificil para esto. Eso será para otra fase, por ahora haz esto. Por ahora esto ponlo en un servicio y ya luego lo adaptamos mejor.

Delays / Tiempos de espera: Cualquier número usado en setTimeout o tu función delay().

Colores, Tags o Estados: Cualquier string como "Normal", "Elite", clases de CSS quemadas como "semi-tag-green-light".

REGLAS:

No alteres en absoluto la lógica del negocio ni el funcionamiento del DOM.

Utiliza la convención UPPER_SNAKE_CASE para nombrar las constantes sueltas.

