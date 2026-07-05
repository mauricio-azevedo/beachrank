'use client';

import { useEffect, useState } from 'react';
import { BellOff, Loader2 } from 'lucide-react';
import { Body, Label, Overline } from '@/components/ui/text';
import { getAccessToken } from '@/lib/auth';
import type { AppNotification } from '@/types/api';
import {
  getNotifications,
  markAllNotificationsRead,
} from '@/features/notifications/api/notifications.api';
import { NotificationCard } from './notification-card';
import { EmptyState } from '@/components/ui/empty-state';

type Status = 'loading' | 'ready' | 'error';

export function NotificationsInbox() {
  const [status, setStatus] = useState<Status>('loading');
  const [items, setItems] = useState<AppNotification[]>([]);

  useEffect(() => {
    let isCurrent = true;

    async function load() {
      const token = getAccessToken();
      if (!token) {
        if (isCurrent) setStatus('ready');
        return;
      }

      try {
        const data = await getNotifications(token);
        if (!isCurrent) return;
        setItems(data);
        setStatus('ready');
      } catch {
        if (isCurrent) setStatus('error');
      }
    }

    load();
    return () => {
      isCurrent = false;
    };
  }, []);

  async function handleMarkAllRead() {
    const token = getAccessToken();
    if (!token) return;

    // Optimistic: they move to "Anteriores" immediately; the bell dot clears.
    setItems((prev) => prev.map((item) => ({ ...item, read: true })));
    try {
      await markAllNotificationsRead(token);
    } catch {
      // A failed mark-read is low-stakes; the next load reconciles.
    }
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-[50vh] items-center justify-center text-faint-foreground">
        <Loader2 className="size-6 animate-spin" aria-hidden />
      </div>
    );
  }

  if (status === 'error') {
    return (
      <Body className="py-16 text-center text-muted-foreground">
        Não foi possível carregar suas notificações agora.
      </Body>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        className="min-h-[50vh] justify-center"
        size="sm"
        icon={<BellOff className="size-6" aria-hidden />}
        title="Você está em dia. Nada por aqui."
      />
    );
  }

  const unread = items.filter((item) => !item.read);
  const earlier = items.filter((item) => item.read);

  return (
    <div className="space-y-6">
      {unread.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <Overline size="xs" className="text-faint-foreground">
              Novas
            </Overline>
            <button
              type="button"
              onClick={handleMarkAllRead}
              className="text-brand transition-opacity active:opacity-60"
            >
              <Label className="text-brand">Marcar lidas</Label>
            </button>
          </div>
          <div className="space-y-3">
            {unread.map((item) => (
              <NotificationCard key={item.id} notification={item} />
            ))}
          </div>
        </section>
      )}

      {earlier.length > 0 && (
        <section className="space-y-3">
          <Overline size="xs" className="px-0.5 text-faint-foreground">
            Anteriores
          </Overline>
          <div className="space-y-3">
            {earlier.map((item) => (
              <NotificationCard key={item.id} notification={item} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
