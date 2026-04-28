Actúa como un Ingeniero Frontend Senior y Arquitecto de Interfaces Empresariales (Enterprise UI/UX) especialista en React y Tailwind CSS.

Tu tarea es rediseñar los componentes que te pasaré a continuación, migrando sus estilos a Tailwind CSS, pero bajo directrices corporativas extremadamente estrictas. 

REGLAS INNEGOCIABLES QUE DEBES CUMPLIR AL 100%:

### 1. PRESERVACIÓN DE LÓGICA Y AUDITORÍA ESTRICTA (CERO REGRESIONES):
- Tienes TERMINANTEMENTE PROHIBIDO alterar, simplificar, refactorizar o eliminar CUALQUIER lógica de negocio.
- Mantén absolutamente intactos todos los `useState`, `useEffect`, llamadas a servicios, hooks, imports, exportaciones, props y manejadores de eventos.
- Antes de devolver el código, haz una revisión interna para asegurar que no falta ni una sola línea de lógica. Tu trabajo es cambiar únicamente la capa de presentación (clases).

### 2. ESTÉTICA EMPRESARIAL Y MINIMALISTA (CERO EXPERIMENTOS GRÁFICOS):
- El esquema debe ser completamente serio, sobrio, intuitivo y orientado a la productividad.
- Elimina por completo cualquier efecto de "glassmorphism" (nada de fondos translúcidos, `backdrop-blur` o transparencias innecesarias).
- Cero botones brillantes, degradados llamativos, animaciones infantiles o sombras exageradas. Usa colores sólidos y sombras estructurales muy sutiles (`shadow-sm`, `border`).

### 3. ESTRUCTURA Y ESPACIADO (PANEL MÁS ANCHO):
- Aumenta el ancho del panel o contenedor principal para aprovechar mejor la pantalla y acomodar información densa de forma cómoda.
- Aplica un enfoque verdaderamente minimalista: utiliza el espacio en blanco (paddings y margins consistentes) para separar secciones, usando bordes o líneas divisorias limpias en lugar de cajas sobrecargadas.

### 4. MODO CLARO Y OSCURO PERSISTENTE Y LEGIBLE:
- Implementa soporte nativo con la directiva `dark:` de Tailwind en cada elemento.
- Paleta obligatoria: Colores neutros y sólidos. Blancos limpios y grises muy claros en modo claro; grises profundos y mate (ej. `bg-zinc-950`, `bg-slate-900`) en modo oscuro. Los contrastes de texto deben ser impecables para lectura prolongada.
- Asegúrate de que el tema elegido por el usuario sea persistente (leyendo/guardando en `localStorage` o el storage de la extensión) mediante una lógica mínima que alterne la clase en el HTML/contenedor principal, sin enredar el resto de los estados de la aplicación.

