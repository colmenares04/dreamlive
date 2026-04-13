# DreamLive – Frontend

React 18 + TypeScript + Vite + TailwindCSS con arquitectura **hexagonal estricta**.

---

## 🏗️ Estructura del proyecto

```
src/
├── core/                        ── DOMINIO PURO ──
│   ├── entities/index.ts        → Tipos TypeScript + clase UserPermissions
│   └── utils/index.ts           → Formateo de fechas, números, strings, Excel
│
├── adapters/                    ── COMUNICACIÓN HTTP ──
│   └── http/index.ts            → ApiClient (axios + interceptor JWT)
│                                  TokenStorage (sessionStorage)
│                                  AuthAdapter, LicenseAdapter,
│                                  AgencyAdapter, LeadAdapter,
│                                  VersionAdapter, OverviewAdapter,
│                                  DashboardAdapter
│
├── infrastructure/              ── REACT INFRAESTRUCTURA ──
│   ├── context/
│   │   ├── AuthContext.tsx      → Estado global auth (user, login, logout…)
│   │   └── NotificationContext.tsx → Toasts + ConfirmDialog global
│   ├── guards/
│   │   └── ProtectedRoute.tsx   → ProtectedRoute (roles) + PublicOnlyRoute
│   └── hooks/
│       ├── index.ts             → useDebounce, useAsync, usePagination,
│       │                          useToast, useConfirm
│       └── useCaptcha.ts        → reCAPTCHA v2 hook + CaptchaBox component
│
└── presentation/                ── UI ──
    ├── auth/
    │   └── AuthPages.tsx        → LoginPage, RegisterPage,
    │                              RecoverPasswordPage, ResetPasswordPage
    ├── admin/
    │   └── AdminConsole.tsx     → Panel Admin/Programmer
    │                              Secciones: Overview, Licencias,
    │                              Agencias, Actualizaciones
    ├── panel/
    │   └── AgencyPanel.tsx      → Panel Owner/Agent
    │                              Secciones: Dashboard (Recharts),
    │                              Leads (paginado), Team Manager
    └── shared/
        ├── index.tsx            → Sidebar, StatCard, Badge, Modal,
        │                          DataTable, Collapsible, PageHeader, Button
        ├── ProfilePage.tsx      → Perfil de usuario + cambio de contraseña
        └── ErrorPages.tsx       → NotFoundPage (404), UnauthorizedPage (403)
```

---

## 🚀 Setup

```bash
# 1. Instalar dependencias
npm install

# 2. Variables de entorno
cp .env.local.example .env.local
# Editar VITE_API_URL y VITE_RECAPTCHA_SITE_KEY

# 3. Iniciar servidor de desarrollo
npm run dev          # → http://localhost:5173

# 4. Build de producción
npm run build        # → dist/
npm run preview      # Previsualizar build
```

---

## 👥 Flujo de navegación por rol

| Ruta            | Roles permitidos         | Panel               |
|----------------|--------------------------|---------------------|
| `/login`        | Todos (sin sesión)       | Auth                |
| `/register`     | Todos (sin sesión)       | Auth                |
| `/recover`      | Todos (sin sesión)       | Auth                |
| `/console`      | `admin`, `programmer`    | AdminConsole        |
| `/panel`        | `owner`, `agent`         | AgencyPanel         |
| `/profile`      | Todos (con sesión)       | ProfilePage         |
| `/`             | Auto-redirección por rol | —                   |

---

## 🔐 Seguridad en cliente

- **JWT en sessionStorage**: se borra al cerrar el tab (no `localStorage`).
- **Refresh automático**: El interceptor de axios renueva el `access_token`
  silenciosamente cuando recibe un `401`.
- **Guards de ruta**: `ProtectedRoute` bloquea por rol; si el rol no coincide
  redirige al panel correcto en lugar de mostrar un error.
- **reCAPTCHA v2**: integrado en Login; el token se envía al backend para
  validación server-side.

---

## 📦 Dependencias principales

| Paquete                   | Uso                              |
|--------------------------|----------------------------------|
| `react-router-dom`        | Enrutamiento SPA                 |
| `axios`                   | HTTP + interceptores JWT         |
| `recharts`                | Gráficas (Dashboard)             |
| `xlsx`                    | Exportación Excel de Leads       |
| `date-fns`                | Formateo de fechas               |
| `clsx`                    | Clases condicionales Tailwind    |
| `@tanstack/react-query`   | (Disponible para uso futuro)     |

---

## 🌐 Variables de entorno

| Variable                   | Descripción                          | Ejemplo                            |
|---------------------------|--------------------------------------|------------------------------------|
| `VITE_API_URL`             | URL base de la API FastAPI           | `http://localhost:8000/api/v1`     |
| `VITE_RECAPTCHA_SITE_KEY`  | Site key pública de reCAPTCHA v2    | `6Le...`                           |
