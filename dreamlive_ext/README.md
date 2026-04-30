Actúa como un Diseñador de Interfaces UI/UX Senior y Experto en React 19. Vamos a construir la pantalla principal (`Dashboard`) de la extensión `dreamlive_ext`. 

El objetivo es transformar el actual `DashboardPlaceholder.tsx` en una interfaz profesional, corporativa y funcional que siga la estética **GitHub Dark Mode** (bordes `#30363d`, fondos `#0d1117`, acentos verdes `#238636`).

### REGLAS DE NEGOCIO Y DATOS:
1. **Aislamiento Total:** Solo se pueden mostrar datos provenientes del `AuthContext` (User y License). No se debe mostrar ninguna información externa o de otras licencias.
2. **Dualidad de Vistas:** La pantalla debe estar dividida en dos secciones principales (usando un sistema de Tabs o Navegación):
    * **Sección 1: Perfil y Licencia (Prioridad Actual):** Enfoque total en los datos del usuario y el estado de su suscripción.
    * **Sección 2: Operaciones (Preparación):** Un placeholder elegante para las futuras herramientas operativas (Leads, Mensajería, etc.).

### REQUISITOS DE UI/UX (Estilo GitHub Premium):
1. **Header Inteligente:** * Debe mostrar el nombre del usuario y su rol.
    * **Switch de Tema:** Integra el `ThemeContext` existente para permitir el cambio entre modo claro/oscuro con un componente de switch animado (usa Lucide React para los iconos de Sol/Luna).
    * Botón de Logout minimalista.
2. **Dashboard de Licencia (Sección 1):**
    * **Cards Informativas:** Muestra la `License Key` (con opción de ocultar/ver), la `Fecha de Expiración` (con un badge de estado: Activa/Por vencer), y el contador de `Dispositivos` (ej: "Sesiones: 1/5").
    * **Visualización de Usuario:** Un área dedicada con un avatar generado (o iniciales) y los datos de contacto del administrador.
3. **Layout Operativo (Sección 2):**
    * Deja preparada una pestaña llamada "Consola Operativa" con un diseño de "Empty State" profesional (un icono grande y un texto que diga: "Módulo operativo próximamente disponible").

### REQUISITOS TÉCNICOS:
* **Framework:** React 19, Tailwind CSS v4, Lucide React.
* **Componentes:** Usa los componentes de UI que ya tenemos en `shared/components/ui` (Button, Card, Input).
* **Consumo de Datos:** Extrae todo del hook `useAuth()`.
* **Animaciones:** Usa `framer-motion` (si está disponible) o transiciones de Tailwind para el cambio entre pestañas y el cambio de tema.

Entrégame el código para `Dashboard.tsx` (que sustituirá al placeholder) y cualquier sub-componente necesario para que la interfaz se vea "Pixel-Perfect" y Enterprise.


Las pantallas deben tener animaciones y transiciones frescas y empresariales.