# PanelAdm.php - Guía de Configuración

## ✅ Archivo Creado Exitosamente

Se ha creado `PanelAdm.php` - un archivo PHP de **2,505 líneas** que contiene:

- ✅ Backend PHP con sesiones y API endpoints
- ✅ Todo el HTML y CSS original
- ✅ JavaScript modificado para usar PHP en lugar de Supabase client-side

## 🔧 Configuración Requerida

### Paso 1: Obtener Service Role Key de Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **Settings** → **API**
3. Copia la **service_role key** (NO la anon key)

### Paso 2: Editar PanelAdm.php

Abre `PanelAdm.php` y busca la **línea 13**:

```php
define('SUPABASE_SERVICE_KEY', 'YOUR_SERVICE_ROLE_KEY_HERE');
```

Reemplaza `'YOUR_SERVICE_ROLE_KEY_HERE'` con tu Service Role Key:

```php
define('SUPABASE_SERVICE_KEY', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...');
```

### Paso 3: Subir al Servidor

1. Sube `PanelAdm.php` a tu servidor web
2. Asegúrate de que PHP 7.0+ esté instalado
3. Asegúrate de que la extensión cURL esté habilitada

### Paso 4: Acceder

Abre tu navegador y ve a:

```
https://tu-dominio.com/PanelAdm.php
```

## 🔒 Mejoras de Seguridad Implementadas

| Antes (HTML)                              | Ahora (PHP)                               |
| ----------------------------------------- | ----------------------------------------- |
| ❌ Credenciales expuestas en el navegador | ✅ Credenciales protegidas en el servidor |
| ❌ Consultas DB desde el cliente          | ✅ Consultas DB desde el servidor         |
| ❌ Sin validación server-side             | ✅ Validación en cada petición            |
| ❌ LocalStorage para sesiones             | ✅ Sesiones PHP seguras                   |

## 📝 Cambios Principales

### Backend PHP (Líneas 1-174)

- Configuración de Supabase
- Función `supabaseQuery()` para llamadas REST API
- API Endpoints:
  - `?api=login` - Autenticación
  - `?api=logout` - Cerrar sesión
  - `?api=check_session` - Verificar sesión
  - `?api=dashboard` - Datos del dashboard
- Manejo de sesiones con timeout de 30 minutos

### Frontend Modificado

- **Login**: Ahora usa `fetch('?api=login')` en lugar de Supabase client
- **Logout**: Llama a `?api=logout` para destruir sesión PHP
- **Inicialización**: Verifica sesión PHP en lugar de localStorage

## ⚠️ Importante

> **NUNCA** compartas tu Service Role Key públicamente. Esta key tiene permisos completos sobre tu base de datos.

> Si usas Git, agrega `PanelAdm.php` al `.gitignore` o usa variables de entorno.

## 🚀 Próximos Pasos (Opcional)

Para completar la funcionalidad, necesitarás agregar más endpoints PHP para:

- Cargar leads (`?api=leads`)
- Gestión de equipo (`?api=team`)
- Purge de datos (`?api=purge`)
- Export a Excel (`?api=export`)

¿Quieres que implemente estos endpoints adicionales?
