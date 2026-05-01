import { useState, useEffect } from 'react';
import { fetchNotifications, markNotificationsRead } from '@/lib/api';
import { getEcho } from '@/lib/echo';
import { useWallet } from '@/lib/wallet-context';

export function useNotifications() {
    const { address, isConnected } = useWallet();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);

    useEffect(() => {
        if (!isConnected || !address) return;

        // Fetch initial set
        fetchNotifications().then(data => {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }).catch(err => console.error("Failed to fetch notifications:", err));

        // Connect Echo
        const echo = getEcho();
        if (!echo) return;

        // Listen for new notifications
        const channelName = `user.${address}`;
        echo.private(channelName)
            .listen('NotificationSent', (e: any) => {
                setNotifications(prev => [e.notification, ...prev]);
                setUnreadCount(count => count + 1);
            });

        return () => {
            echo.leave(channelName);
        };
    }, [isConnected, address]);

    const markAsRead = async () => {
        try {
            await markNotificationsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch (err) {
            console.error("Failed to mark notifications read:", err);
        }
    };

    return { notifications, unreadCount, markAsRead };
}
