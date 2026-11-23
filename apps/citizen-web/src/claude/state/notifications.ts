import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { NotificationDTO } from '@torbat/contracts';
import { api } from '../lib/backend';
import { useUser } from './session';

export function useNotices() {
  const user = useUser();
  return useQuery({
    queryKey: ['claude-notices', user?.phone],
    enabled: !!user,
    queryFn: async ({ signal }) => {
      const { data } = await api<{ data: NotificationDTO[] }>('/notifications', { signal });
      return data.map(item => ({
        id: item.id, title: item.title, body: item.body, at: Date.parse(item.createdAt),
        read: !!item.readAt, link: item.entityType === 'request' ? '/shahrbin/reports/' + item.entityId : undefined,
      }));
    },
    refetchInterval: 15000,
  });
}

export function useMarkNotice() {
  const client = useQueryClient();
  return async (ids: string[]) => {
    try {
      for (const id of ids) await api('/notifications/' + id + '/read', { method: 'PATCH' });
    } finally {
      await client.invalidateQueries({ queryKey: ['claude-notices'] });
    }
  };
}

// The existing staff panel controls real service availability. Mock toggles are excluded.
const disabled: string[] = [];
export const useDisabledServices = () => disabled;
