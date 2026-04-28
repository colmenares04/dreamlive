import { useState, useEffect, useCallback } from 'react';
import { AgenciesAdapter } from '../services/http/agencies';
import type { AgencyPermissionsConfig } from '../core/entities';
import { useAuth } from '../contexts';

/**
 * useAgencyPermissions Hook
 * 
 * Gestiona la carga y actualización de los permisos dinámicos de la agencia.
 * Mantiene el estado sincronizado para que la UI reaccione a los cambios.
 */
export function useAgencyPermissions() {
  const { role } = useAuth();
  const [permissions, setPermissions] = useState<AgencyPermissionsConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    // Solo si el usuario pertenece a una agencia y es administrador/agente
    if (role === 'superuser' || role === 'agency_admin' || role === 'agent') {
      setLoading(true);
      try {
        const data = await AgenciesAdapter.getMyPermissions();
        setPermissions(data);
        setError(null);
      } catch (err) {
        console.error('[useAgencyPermissions] Error fetching:', err);
        setError('Error al cargar la configuración de permisos.');
      } finally {
        setLoading(false);
      }
    }
  }, [role]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const updatePermissions = async (newConfig: AgencyPermissionsConfig) => {
    setLoading(true);
    try {
      await AgenciesAdapter.updateMyPermissions(newConfig);
      setPermissions(newConfig);
      return true;
    } catch (err) {
      console.error('[useAgencyPermissions] Error updating:', err);
      setError('No se pudieron guardar los cambios.');
      return false;
    } finally {
      setLoading(false);
    }
  };

  return { permissions, loading, error, refresh: fetchPermissions, updatePermissions };
}
