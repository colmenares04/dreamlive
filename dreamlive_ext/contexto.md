Actúa como un Ingeniero Frontend Principal. Tenemos que migrar el "Core Operativo" de nuestra antigua extensión (`old_ext`) a la nueva arquitectura (`dreamlive_ext`).

El Core Operativo realiza tres procesos principales en TikTok:
1. Recopilar leads y almacenarlos (DOM Scraping).
2. Comprobar disponibilidad de los leads (Vistas Backstage/Live).
3. Enviar mensajes automáticos.

Quiero migrar estas funcionalidades respetando la lógica de negocio actual, pero adaptándolas a nuestra nueva arquitectura estricta.

### REGLAS DE MIGRACIÓN (CRÍTICAS):
1. **Nada de Supabase en el Cliente:** En `old_ext`, los servicios (`src/services/leads.ts`, `messaging.ts`, etc.) usaban el cliente de Supabase. En la nueva extensión, ESTÁ PROHIBIDO usar Supabase. Debes refactorizar estos servicios para que usen nuestro `infrastructure/api/apiClient.ts` haciendo llamadas REST a nuestra API en Python.
2. **Respetar el DOM Scraping:** La lógica de extracción de datos del DOM (query selectors, manipulación de UI en `content.ts` o componentes como `ActionPanel.tsx`) debe mantenerse tal cual como está en `old_ext`. Si funcionaba, no la rompas, solo adáptala a React 19 y Tailwind v4 si es necesario.
3. **Comunicación Background/Content:** Mantén el uso de los puertos o mensajería nativa de WXT entre el `background.ts` y el `content.ts`.

### PLAN DE EJECUCIÓN (Responde ejecutando solo la FASE 1):

**FASE 1: Capa de Servicios y API (Sin tocar la UI todavía)**
* Analiza los archivos `src/services/leads.ts`, `messaging.ts` y `backstage.ts` de la `old_ext`.
* Crea sus equivalentes en `dreamlive_ext` dentro de la carpeta `features/operations/services/` (ej. `leads.service.ts`).
* Sustituye todas las llamadas de Supabase por métodos estáticos usando `apiClient.get/post/patch`. (Asume que los endpoints en la API ya existen, ej: `/api/v1/leads`).

**FASE 2: Content Scripts y UI Inyectada (Te la pediré después)**
* Migración de `main.content` y `backstage.content` para inyectar el panel en TikTok.

**FASE 3: Vistas del Dashboard (Popup)**
* Migrar las tablas y modales de los leads a la pestaña "Operativa" que dejamos preparada en el `Dashboard.tsx`.

Por favor, revisa el código de `old_ext` y entrégame el código correspondiente a la **FASE 1**. Crea las interfaces/tipos necesarios para los Leads y Mensajes basándote en la API.