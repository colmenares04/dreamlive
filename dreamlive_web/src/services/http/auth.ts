/**
 * AuthAdapter
 * 
 * Clase de servicio que encapsula todas las llamadas a la API relacionadas
 * con la autenticación, gestión de sesiones y perfiles de usuario.
 * Interactúa directamente con el backend y gestiona la persistencia de tokens.
 */
import { http } from './apiClient';
import { TokenStorage } from './tokenStorage';
import type { AuthTokens, User } from '../../core/entities';

export class AuthAdapter {
  /**
   * Inicia sesión en la plataforma y guarda los tokens resultantes.
   * 
   * @param {string} email - Correo electrónico del usuario.
   * @param {string} password - Contraseña en texto plano.
   * @param {string} [captchaToken] - Token de verificación opcional.
   * @returns {Promise<AuthTokens>} Promesa con los tokens de acceso y refresco.
   */
  static async loginAgency(email: string, password: string, captchaToken?: string): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/login', {
      email, password, captcha_token: captchaToken,
    });
    TokenStorage.save(data);
    return data;
  }

  /**
   * Obtiene la lista de perfiles asociados a la agencia actualmente autenticada.
   * 
   * @returns {Promise<Array<any>>} Lista de usuarios de la agencia.
   */
  static async getAgencyProfiles(): Promise<Array<{ id: string; username: string; email: string; role: string; has_password: boolean }>> {
    const { data } = await http.get('/auth/agency/users');
    return data;
  }

  /**
   * Crea un nuevo perfil (usuario) dentro de la agencia.
   * 
   * @param {string} username - Nombre de usuario.
   * @param {string} email - Correo del nuevo perfil.
   * @param {string} password - Contraseña inicial.
   * @param {string} role - Rol asignado.
   */
  static async createAgencyProfile(username: string, email: string, password: string, role: string = 'agency_admin') {
    const { data } = await http.post('/auth/agency/users', { username, email, password, role });
    return data;
  }

  /**
   * Cambia el contexto de autenticación a un perfil específico (sub-usuario).
   * 
   * @param {string} user_id - UUID del usuario a seleccionar.
   * @param {string} [password] - Contraseña si el perfil requiere validación extra.
   * @returns {Promise<AuthTokens>} Nuevos tokens para el perfil seleccionado.
   */
  static async selectProfile(user_id: string, password?: string): Promise<AuthTokens> {
    const { data } = await http.post<AuthTokens>('/auth/users/select', {
      user_id, password
    });
    TokenStorage.save(data);
    return data;
  }

  /**
   * Registra una nueva cuenta maestra en el sistema.
   * 
   * @param {Object} payload - Datos de registro.
   * @returns {Promise<Object>} Datos del usuario creado.
   */
  static async register(payload: {
    email: string; username: string; password: string;
    full_name?: string; role?: string; agency_id?: string;
  }): Promise<{ user_id: string }> {
    const { data } = await http.post('/auth/register', payload);
    return data;
  }

  /**
   * Solicita el envío de un correo de recuperación de contraseña.
   * 
   * @param {string} email - Correo de la cuenta.
   */
  static async requestPasswordReset(email: string): Promise<void> {
    await http.post('/auth/password-reset/request', { email });
  }

  /**
   * Confirma el cambio de contraseña usando el token recibido por correo.
   * 
   * @param {string} token - Token de validación.
   * @param {string} newPassword - Nueva contraseña.
   */
  static async confirmPasswordReset(token: string, newPassword: string): Promise<void> {
    await http.post('/auth/password-reset/confirm', {
      token, new_password: newPassword,
    });
  }

  /**
   * Recupera la información completa del usuario actual basado en el token.
   * 
   * @returns {Promise<User>} Datos del perfil actual.
   */
  static async getMe(): Promise<User> {
    const { data } = await http.get<User>('/auth/me');
    return data;
  }

  /**
   * Cierra la sesión activa eliminando todos los tokens locales.
   */
  static logout(): void { TokenStorage.clear(); }
}
