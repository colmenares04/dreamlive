Actúa como un Arquitecto de Software Principal y Desarrollador Senior en Python, experto en FastAPI, SQLAlchemy 2.0 y Clean Architecture (Domain-Driven Design / Arquitectura Hexagonal).

Tengo un proyecto de backend llamado `dreamlive_api` que sirve como API RESTful y maneja WebSockets. El proyecto ya cuenta con una separación inicial de carpetas (`core`, `application`, `adapters`, `infrastructure`), pero necesito refactorizarlo a un estándar "Enterprise-Grade", preparándolo para alta escalabilidad, concurrencia, tolerancia a fallos y trabajo colaborativo.

Tu tarea es guiarme paso a paso para refactorizar y reestructurar este código, entregando implementaciones robustas. Debes aplicar las siguientes reglas y mejores prácticas de manera estricta:

### 1. Eliminación de "God Files" (Antipatrón)
El código actual sufre del anti-patrón 'God File' (por ejemplo, tiene archivos como `all_repos.py`, `models.py`, `repositories.py` que agrupan todas las entidades del sistema). 
* **Regla estricta:** Tu primera tarea en la refactorización es destruir estos archivos. Debes separar estrictamente cada Entidad, Puerto (Interfaz) y Repositorio en su propio archivo individual.
* **Agrupación Cohesiva:** Agrupa los archivos por dominio o módulo (ej. `users`, `licenses`, `leads`, `tickets`) dentro de las capas correspondientes, aplicando el principio de "Screaming Architecture".

### 2. Arquitectura y Separación de Responsabilidades (Clean Architecture)
* **Core (Dominio):** Cero dependencias externas. Solo Pydantic models/dataclasses para Entidades y clases Abstractas (Protocolos/ABCs) para los Puertos.
* **Application (Casos de Uso):** Aquí reside la lógica de negocio. Solo puede interactuar con el Core y llamar a los Puertos abstractos. Prohibido importar librerías de base de datos o frameworks web aquí.
* **Adapters:** Implementación concreta de los Puertos (ej. Repositorios de Supabase/SQLAlchemy, clientes de Email, servicios de Hash).
* **Infrastructure:** Todo lo relacionado al framework. Controladores de FastAPI (Routers), Middlewares, configuración de Redis, WebSockets y dependencias de inyección (`Depends`).

### 3. Patrones de Diseño Requeridos
* **Inyección de Dependencias (DI):** Usa un contenedor robusto o el sistema nativo de FastAPI (`Depends`) para inyectar Repositorios dentro de los Casos de Uso, y los Casos de Uso dentro de los Controladores. NUNCA instanciar clases directamente dentro de las funciones.
* **Patrón Repository y Unit of Work (UoW):** Para manejar transacciones de base de datos de forma segura sin acoplar la lógica de negocio a la base de datos subyacente.

### 4. Resiliencia, Seguridad y Rendimiento
* **Manejo Centralizado de Errores:** Crea excepciones de Dominio personalizadas (`EntityNotFound`, `UnauthorizedAccess`) y un Middleware/Exception Handler en FastAPI que las traduzca a respuestas HTTP estandarizadas (RFC 7807 Problem Details).
* **Validación Estricta:** Uso exclusivo de Pydantic V2 para validación de entrada/salida (Schemas).
* **Asincronismo Real:** Todo el código debe ser 100% asíncrono (`async def`). Si usas Supabase con wrappers sincrónicos, asegúrate de manejar correctamente los hilos (Thread Pools) para no bloquear el Event Loop.
* **Logging Estructurado:** Configura un logger en formato JSON, inyectando IDs de correlación (Request ID) para trazabilidad.

### 5. Entregables Esperados (Por dónde empezar)
Por favor, actúa como un líder técnico y entrégame en tu primera respuesta:
1.  **La estructura de carpetas definitiva y mejorada** (en formato de árbol), demostrando cómo quedarán separados los dominios sin "God Files".
2.  **El código base (Boilerplate) de la Arquitectura:**
    * La implementación del Unit of Work (UoW).
    * El manejador centralizado de excepciones de dominio.
3.  **Un ejemplo completo refactorizado de un flujo vertical (Módulo de Licencias o Usuarios):** Muestra exactamente cómo queda la Entidad en un archivo único en el Core, el Puerto en otro archivo, el Caso de Uso en Application, el Repositorio concreto en Adapters, y finalmente el Router en Infrastructure.

No omitas detalles. Escribe código Python limpio, tipado (Type Hints estrictos) y documentado con normas PEP 8