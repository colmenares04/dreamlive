# Reorganización propuesta del frontend

Resumen de cambios y pasos recomendados para dejar la app con una estructura
limpia, modular y fácil de mantener.

Objetivos
- Separar responsabilidades: `services`, `contexts`, `hooks`, `components`, `pages`.
- Crear archivos "barrel" para imports más intuitivos.
- Añadir documentación (JSDoc) y patrones consistentes.

Cambios aplicados (esta etapa)
- Añadidos `src/services/index.ts`, `src/contexts/index.ts`, `src/hooks/index.ts` como
  puntos de entrada (barrels) que re-exportan los módulos existentes. Esto permite
  usar rutas más claras sin mover ficheros inmediatamente.
- Actualizado `src/App.tsx` para consumir `AuthProvider` y `NotificationProvider`
  desde `./contexts`.

Estructura objetivo sugerida
```
src/
  adapters/         # adaptadores de bajo nivel (opcional)
  services/         # capa de servicios / API (barrel: services/index.ts)
  contexts/         # providers y hooks globales (barrel: contexts/index.ts)
  hooks/            # hooks reutilizables (barrel: hooks/index.ts)
  components/       # componentes UI atómicos y compuestos
  pages/            # vistas / páginas (anteriormente presentation/*)
  presentation/     # (si se mantiene) vistas organizadas por dominio
  utils/            # utilidades puras
  core/             # entidades y tipos
```

Siguientes pasos recomendados
1. Migrar archivos físicamente: mover `infrastructure/context/*` → `contexts/`,
   `infrastructure/hooks/*` → `hooks/`, `adapters/http/*` → `services/http/`.
2. Añadir `index.ts` en `services/http` con exports tipados y exportar en `services/index.ts`.
3. Ejecutar `pnpm build` o `tsc --noEmit` y corregir imports rotos.
4. Añadir JSDoc en los controllers y servicios importantes (ej. AuthAdapter, TokenStorage,
   AuthContext) y crear reglas de ESLint/Prettier para mantener consistencia.
5. Hacer commit en una rama `refactor/frontend-structure` y revisar cambios por partes.

Comandos útiles
```bash
# Ver tipos sin generar salida
pnpm run tsc --noEmit

# Buscar imports antiguos
pnpm dlx depcruise --include-only "src" --exclude "node_modules" |
# (o usar grep) grep -R "infrastructure/context" src || true
```

Notas
- Esta PR inicial evita mover archivos en bloque para reducir riesgo; en su lugar
  se añaden barrels para facilitar la migración incremental.

Tailwind & Mobile-first
- **Diseño mobile-first**: todas las nuevas clases y componentes deben pensarse
  primero para pantallas pequeñas y luego añadir modificadores `md:`/`lg:`.
- **Utilizar utilidades de Tailwind** para el layout, espaciado y responsividad
  (evitar CSS globales que rompan el flujo). Ejemplos:
  - `w-full max-w-[360px]` para tarjetas/toasts en mobile
  - `left-4 right-4 md:right-6 md:left-auto` para posicionar elementos flotantes
  - `p-4 rounded-xl shadow` para modales y tarjetas
- **Testing visual**: probar en tamaños 360×800, 412×915, 768×1024 y 1280×800.

