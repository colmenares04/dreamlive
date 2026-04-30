Actúa como un desarrollador Senior especializado en React, Tailwind CSS y extensiones de navegador usando el framework WXT. 

Tu tarea es generar el código completo para el módulo de Autenticación (`features/auth`) y su respectivo servicio de conexión (`infrastructure/api`) para una extensión de navegador.

### 1. Requisitos de Arquitectura y Tecnologías
* **Framework:** React 19, WXT, Tailwind CSS v4, y Lucide React para iconos.
* **Infraestructura:** Usa `fetch` nativo del navegador (NO Axios). No se usará Supabase en el cliente.
* **Estructura de archivos esperada:**
    * `infrastructure/api/auth.service.ts`: Clases o funciones exportadas para conectar con la API (login por email, login por licencia, registro de usuario, vinculación de licencia). Deja los endpoints como variables/constantes fáciles de cambiar.
    * `features/auth/components/`: Componentes UI para los distintos pasos del flujo.
    * `features/auth/hooks/`: Un hook `useAuth` para manejar la lógica de estado y llamadas al servicio.

### 2. Flujo Lógico de Autenticación
El sistema debe manejar dos métodos de entrada iniciales, presentados claramente al usuario (por ejemplo, mediante pestañas o botones de selección):
* **Opción A (Email/Contraseña):** El usuario ingresa credenciales. 
    * *Condición:* Si la API devuelve éxito pero indica que el usuario NO tiene una licencia vinculada, la UI debe cambiar obligatoriamente a una pantalla de "Vincular Licencia" antes de dar acceso final.
* **Opción B (Licencia):** El usuario ingresa una clave de licencia.
    * *Condición:* Si la API devuelve éxito pero indica que la licencia NO tiene un usuario administrador registrado, la UI debe cambiar obligatoriamente a una pantalla de "Registro de Usuario" (pidiendo nombre, email y contraseña).

### 3. Requisitos de UI/UX (Diseño)
* **Temática Empresarial:** El diseño debe ser serio, profesional, limpio y fácil de entender (nada artístico ni sobrecargado).
* **Paleta de Colores:** Basado en tonos Grises, Blancos, Negros y acentos en Verde (ej. `bg-green-600`, `text-green-500` para botones primarios o estados de éxito).
* **Modo Oscuro:** Debe estar completamente soportado mediante las clases `dark:` de Tailwind, garantizando un alto contraste (ej. fondos grises muy oscuros `#121212` o `slate-900` contra textos blancos).
* **Animaciones:** Utiliza transiciones nativas de Tailwind CSS (`transition-all`, `duration-300`, `ease-in-out`, `animate-fade-in`) para suavizar el cambio entre los métodos de login y la aparición de los formularios condicionales (registro/vinculación).

### 4. Entregables Esperados
Genera el código para:
1.  El servicio API `auth.service.ts` con tipado estricto (TypeScript) simulando las respuestas esperadas para probar las condiciones.
2.  El hook `useAuth.ts` que orqueste los estados (cargando, error, requiere_licencia, requiere_usuario, autenticado).
3.  El componente principal `AuthScreen.tsx` (que integra los sub-componentes de formularios y pestañas).

Asegúrate de que el código sea modular, limpio y listo para ser importado en el popup de la extensión WXT.