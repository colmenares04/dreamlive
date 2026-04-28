/**
 * VersionAdapter — listado y publicación de versiones de la app.
 */
import { http } from './apiClient';
import type { AppVersion } from '../../core/entities';

export class VersionAdapter {
  static async list(): Promise<AppVersion[]> {
    const { data } = await http.get<AppVersion[]>('/versions/');
    return data;
  }

  static async publish(payload: {
    version_number: string; changelog: string; tags: string[];
    windows_url: string; windows_size_kb: number;
    macos_url: string; macos_size_kb: number;
  }): Promise<{ published: number; version: string }> {
    const { data } = await http.post('/versions/publish', payload);
    return data;
  }

  static async activate(versionId: string): Promise<void> {
    await http.patch(`/versions/${versionId}/activate`);
  }

  static async remove(versionId: string): Promise<void> {
    await http.delete(`/versions/${versionId}`);
  }
}
