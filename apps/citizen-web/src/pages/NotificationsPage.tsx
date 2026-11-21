import React, { useState, useEffect } from 'react';
import { EmptyState, Button } from '@torbat/ui';
import { Bell, CheckCheck, ChevronLeft, Clock } from 'lucide-react';
import { formatRelative } from '@torbat/i18n';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';

export interface NotificationsPageProps {
  onNavigateRequest: (id: string) => void;
}

export const NotificationsPage: React.FC<NotificationsPageProps> = ({ onNavigateRequest }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = () => {
    setLoading(true);
    api.getNotifications()
      .then((res) => setNotifications(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadNotifications();
  }, [user]);

  const handleMarkAllRead = async () => {
    await api.markAllNotificationsRead();
    loadNotifications();
  };

  const handleItemClick = async (n: any) => {
    if (!n.readAt) {
      await api.markNotificationRead(n.id);
    }
    if (n.entityType === 'request' && n.entityId) {
      onNavigateRequest(n.entityId);
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-24 text-right">
      <div className="flex items-center justify-between px-1">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-xl font-extrabold text-[#33313A] tracking-tight">اعلان‌ها و پیام‌ها</h2>
          <p className="text-xs text-[#667085]">اطلاع‌رسانی‌های وضعیت درخواست و پیام‌های کارشناسان</p>
        </div>

        {notifications.some((n) => !n.readAt) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleMarkAllRead}
            leftIcon={<CheckCheck className="w-4 h-4" />}
          >
            خواندن همه
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[160px]">
          <span className="w-6 h-6 border-2 border-[#7541A5] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length > 0 ? (
        <div className="flex flex-col gap-2.5">
          {notifications.map((n) => {
            const isUnread = !n.readAt;

            return (
              <div
                key={n.id}
                onClick={() => handleItemClick(n)}
                role="button"
                tabIndex={0}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-3 text-right ${
                  isUnread
                    ? 'bg-purple-50/50 border-purple-200 shadow-2xs'
                    : 'bg-white border-[#E9E6EE] opacity-80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isUnread
                        ? 'bg-[#7541A5] text-white shadow-xs'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    <Bell className="w-4 h-4 stroke-[2]" />
                  </div>

                  <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold text-[#33313A]">{n.title}</span>
                    <p className="text-[11px] text-[#667085] leading-relaxed">{n.body}</p>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      {formatRelative(n.createdAt)}
                    </span>
                  </div>
                </div>

                <ChevronLeft className="w-4 h-4 text-slate-400 shrink-0 self-center" />
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="هیچ اعلانی ندارید"
          description="تغییرات وضعیت درخواست‌ها و پاسخ‌های کارشناسان در این بخش نمایش داده می‌شوند."
        />
      )}
    </div>
  );
};
