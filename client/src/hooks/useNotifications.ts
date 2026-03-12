import { useState, useCallback, useRef } from 'react';

interface UseNotificationsOptions {
  onNotificationClick?: (roomId: string) => void;
}

export function useNotifications({ onNotificationClick }: UseNotificationsOptions = {}) {
  const supported = 'Notification' in window;

  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied'
  );

  // Use a ref so the notification click handler never becomes stale
  const onClickRef = useRef(onNotificationClick);
  onClickRef.current = onNotificationClick;

  const requestPermission = useCallback(async () => {
    if (!supported) return;
    const result = await Notification.requestPermission();
    setPermission(result);
  }, [supported]);

  const notify = useCallback(
    (title: string, body: string, roomId: string) => {
      if (!supported || Notification.permission !== 'granted') return;
      // Skip if the user is actively looking at the app
      if (document.visibilityState === 'visible' && document.hasFocus()) return;

      const notification = new Notification(title, {
        body,
        // tag groups notifications per room so they replace each other instead of stacking
        tag: `room-${roomId}`,
      });

      notification.onclick = () => {
        window.focus();
        onClickRef.current?.(roomId);
        notification.close();
      };
    },
    [supported]
  );

  return { permission, requestPermission, notify };
}
