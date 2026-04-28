import { http } from './apiClient';
import type { AgencyPermissionsConfig } from '../../core/entities';

/**
 * AgenciesAdapter
 * 
 * Gestiona la comunicación con el backend para la configuración de agencias,
 * específicamente el sistema de permisos dinámicos.
 */
export class AgenciesAdapter {
  /**
   * Obtiene la configuración de permisos de la agencia actual.
   * @returns {Promise<AgencyPermissionsConfig>}
   */
  static async getMyPermissions(): Promise<AgencyPermissionsConfig> {
    const { data } = await http.get<AgencyPermissionsConfig>('/agencies/my/permissions');
    return data;
  }

  /**
   * Actualiza los permisos de los roles para la agencia actual.
   * @param {AgencyPermissionsConfig} permissions 
   * @returns {Promise<{ status: string, role_permissions: AgencyPermissionsConfig }>}
   */
  static async updateMyPermissions(permissions: AgencyPermissionsConfig): Promise<any> {
    const { data } = await http.patch('/agencies/my/permissions', permissions);
    return data;
  }
}
