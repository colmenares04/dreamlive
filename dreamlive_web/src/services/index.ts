/**
 * services/index.ts
 *
 * Barrel file para exponer los adaptadores HTTP y utilidades relacionadas
 * como una capa de 'services' más intuitiva. Esto permite mover la
 * organización interna sin romper imports en toda la app.
 *
 * Uso:
 * import { AuthAdapter, TokenStorage } from './services';
 */

// Re-export the http barrel explicitly to help some TS servers resolve the folder
export * from './http/index';
