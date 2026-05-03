# DreamLive

**Plataforma integral para la gestion de reclutamiento de streamers en TikTok Live.**

DreamLive es un ecosistema completo que incluye una extension de Chrome, panel web para agencias, consola de administracion y API backend. Permite a las agencias de streaming automatizar la captura de leads, gestionar licencias y monitorear el rendimiento de sus equipos de reclutamiento.

---

## Arquitectura del Proyecto

```
dreamlive/
├── dreamlive_api/       # Backend API (FastAPI + Python)
├── dreamlive_web/       # Panel Web (React + Vite + TypeScript)
├── dreamlive_ext/       # Extension Chrome (WXT + React)
└── Toolskit/            # Herramientas auxiliares (PHP/HTML)
```

---

## Caracteristicas Principales

### Extension de Chrome (`dreamlive_ext`)
- Captura automatica de streamers en TikTok Live
- Filtrado por keywords (batallas, versus, duelo, pk)
- Envio masivo de mensajes personalizados
- Panel de estadisticas en tiempo real
- Sistema de limites de solicitudes configurable
- Soporte multi-dispositivo con control de sesiones
- Exportacion de leads a Excel

### Panel de Agencias (`dreamlive_web`)
- Dashboard con metricas de rendimiento
- Gestion de leads (recopilados, verificados, contactados)
- Configuracion de plantillas de mensajes
- Visualizacion de estadisticas con graficos
- Sistema de autenticacion JWT
- Soporte para multiples usuarios por agencia

### Consola de Administracion (Superusuario)
- Gestion de agencias y licencias
- Monitoreo global de actividad
- Control de versiones de la extension
- Sistema de actualizaciones OTA
- Logs de auditoria
- Acceso restringido via `/su-access`

### API Backend (`dreamlive_api`)
- Arquitectura hexagonal (Clean Architecture)
- Autenticacion JWT con refresh tokens
- Integracion con Supabase (PostgreSQL)
- Sistema de captcha (reCAPTCHA v2)
- Middleware de logging y manejo de errores
- Documentacion Swagger/OpenAPI

---

## Stack Tecnologico

| Componente | Tecnologias |
|------------|-------------|
| **API** | Python 3.11+, FastAPI, Pydantic, SQLAlchemy, Supabase |
| **Web** | React 18, TypeScript, Vite, TailwindCSS, React Query |
| **Extension** | WXT, React 19, TypeScript, TailwindCSS, Supabase JS |
| **Base de Datos** | PostgreSQL (Supabase) |
| **Almacenamiento** | AWS S3 (actualizaciones) |

---

## Requisitos Previos

- **Node.js** >= 18.x
- **Python** >= 3.11
- **pnpm** (recomendado) o npm
- Cuenta en **Supabase** con proyecto configurado
- (Opcional) Cuenta AWS para almacenamiento S3

---

## Instalacion y Configuracion

### 1. Clonar el repositorio

```bash
git clone https://github.com/colmenares04/dreamlive.git
cd dreamlive
```

### 2. Configurar la Base de Datos (Supabase)

1. Crea un nuevo proyecto en [Supabase](https://supabase.com)
2. Ejecuta el esquema SQL en `dreamlive_api/database.txt`
3. Copia las credenciales (URL y anon key)

### 3. Backend API

```bash
cd dreamlive_api

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # Linux/Mac
# o: venv\Scripts\activate  # Windows

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales
```

**Variables de entorno requeridas (`.env`):**

```env
# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIs...

# Seguridad
SECRET_KEY=tu-clave-secreta-muy-larga
DEBUG=false

# CORS (separar multiples origenes con coma)
ALLOWED_ORIGINS=https://tu-dominio.com,https://app.tu-dominio.com

# Email (opcional - para recuperacion de contrasena)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tu-email@gmail.com
SMTP_PASSWORD=tu-app-password

# reCAPTCHA (opcional)
RECAPTCHA_SECRET_KEY=tu-secret-key

# AWS S3 (opcional - para actualizaciones)
AWS_ACCESS_KEY=AKIAXXXXXXXX
AWS_SECRET_KEY=xxxxxxxx
AWS_REGION=us-east-1
STORAGE_BUCKET=dreamlive-updates
```

**Iniciar el servidor:**

```bash
# Desarrollo
python main.py

# Produccion (con Gunicorn)
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 217.216.94.178:8000
```

### 4. Panel Web

```bash
cd dreamlive_web

# Instalar dependencias
pnpm install

# Configurar API URL
# Editar src/adapters/http/index.ts con tu URL de API

# Desarrollo
pnpm dev

# Build para produccion
pnpm build
```

### 5. Extension de Chrome

```bash
cd dreamlive_ext

# Instalar dependencias
pnpm install

# Configurar Supabase
# Editar src/assets/lib/supabase.ts con tus credenciales

# Desarrollo (abre Chrome con la extension cargada)
pnpm dev

# Build para produccion
pnpm build
# Los archivos estaran en .output/chrome-mv3/
```

---

## Deployment

### API (Recomendado: Railway, Render, o VPS)

```bash
# Usando Docker
docker build -t dreamlive-api .
docker run -p 8000:8000 --env-file .env dreamlive-api

# O directamente con Gunicorn
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker -b 217.216.94.178:8000
```

### Web (Recomendado: Vercel)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Deploy
cd dreamlive_web
vercel --prod
```

**Variables de entorno en Vercel:**
- `VITE_API_URL`: URL de tu API backend

### Extension de Chrome

1. Ejecutar `pnpm build` en `dreamlive_ext/`
2. Comprimir la carpeta `.output/chrome-mv3/`
3. Subir a Chrome Web Store Developer Dashboard

---

## Esquema de Base de Datos

| Tabla | Descripcion |
|-------|-------------|
| `agencies` | Agencias de streaming registradas |
| `users` | Usuarios del sistema (admins, agentes) |
| `licenses` | Licencias asignadas a agencias |
| `license_sessions` | Sesiones activas por licencia |
| `tiktok_leads` | Leads capturados de TikTok |
| `app_versions` | Versiones de la extension |
| `version_downloads` | Registro de descargas |
| `tickets` | Sistema de soporte |
| `audit_logs` | Logs de auditoria |

---

## Endpoints Principales de la API

### Autenticacion
- `POST /api/v1/auth/login` - Iniciar sesion
- `POST /api/v1/auth/logout` - Cerrar sesion
- `POST /api/v1/auth/refresh` - Renovar token
- `POST /api/v1/auth/forgot-password` - Recuperar contrasena

### Licencias
- `GET /api/v1/licenses` - Listar licencias
- `POST /api/v1/licenses` - Crear licencia
- `PUT /api/v1/licenses/{id}` - Actualizar licencia
- `DELETE /api/v1/licenses/{id}` - Eliminar licencia

### Leads
- `GET /api/v1/leads` - Listar leads
- `POST /api/v1/leads` - Registrar lead
- `PUT /api/v1/leads/{id}/status` - Cambiar estado

### Agencias
- `GET /api/v1/agencies` - Listar agencias
- `POST /api/v1/agencies` - Crear agencia
- `GET /api/v1/agencies/{id}/dashboard` - Dashboard de agencia

### Versiones
- `GET /api/v1/versions` - Listar versiones
- `POST /api/v1/versions` - Publicar version
- `GET /api/v1/versions/latest` - Obtener ultima version

---

## Roles y Permisos

| Rol | Acceso |
|-----|--------|
| `superadmin` | Consola de administracion completa |
| `admin` | Gestion de agencias y licencias |
| `agency_admin` | Panel de agencia completo |
| `agent` | Solo visualizacion de leads propios |

---

## Seguridad

- Autenticacion JWT con expiracion configurable
- Refresh tokens para sesiones persistentes
- Limite de dispositivos por licencia
- Captcha en formularios criticos
- Logs de auditoria para acciones sensibles
- Rutas de admin ocultas (`/su-access`)
- CORS configurado por entorno

---

## Desarrollo

### Estructura del API (Clean Architecture)

```
dreamlive_api/app/
├── core/              # Entidades y puertos (interfaces)
│   ├── entities/      # Modelos de dominio
│   └── ports/         # Interfaces de repositorios
├── application/       # Casos de uso
│   ├── auth/
│   ├── leads/
│   └── licenses/
├── adapters/          # Implementaciones
│   ├── db/            # Repositorios Supabase
│   ├── email/         # Servicio de email
│   └── security/      # Handlers de seguridad
└── infrastructure/    # API y middleware
    ├── api/v1/        # Endpoints
    └── middleware/    # CORS, logging, errors
```

### Comandos utiles

```bash
# API - Ejecutar tests
pytest

# API - Linting
ruff check .

# Web - Linting
pnpm lint

# Extension - Type checking
pnpm compile
```

---

## Contribuir

1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

---

## Licencia

Este proyecto es privado y de uso exclusivo para DreamLive.

---

## Soporte

Para soporte tecnico, contactar al equipo de desarrollo o abrir un ticket en el sistema de soporte integrado.
