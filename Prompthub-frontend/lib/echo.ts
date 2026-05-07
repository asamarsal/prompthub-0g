import Echo from 'laravel-echo';
import Pusher from 'pusher-js';
import { getApiToken } from './api';

if (typeof globalThis.window !== 'undefined') {
    (globalThis as any).Pusher = Pusher;
}

let echoInstance: Echo<any> | null = null;

export const getEcho = () => {
    if (typeof globalThis.window === 'undefined') return null;

    // Singleton: reuse existing instance
    if (echoInstance) return echoInstance;

    echoInstance = new Echo({
        broadcaster: 'reverb',
        key: process.env.NEXT_PUBLIC_REVERB_APP_KEY || 'prompthub-key',
        wsHost: process.env.NEXT_PUBLIC_REVERB_HOST || 'localhost',
        wsPort: process.env.NEXT_PUBLIC_REVERB_PORT ? Number.parseInt(process.env.NEXT_PUBLIC_REVERB_PORT, 10) : 8080,
        wssPort: process.env.NEXT_PUBLIC_REVERB_PORT ? Number.parseInt(process.env.NEXT_PUBLIC_REVERB_PORT, 10) : 8080,
        forceTLS: (process.env.NEXT_PUBLIC_REVERB_SCHEME ?? 'http') === 'https',
        enabledTransports: ['ws', 'wss'],
        authorizer: (channel: any, options: any) => {
            return {
                authorize: (socketId: string, callback: any) => {
                    const token = getApiToken();
                    fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000'}/broadcasting/auth`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({
                            socket_id: socketId,
                            channel_name: channel.name
                        })
                    })
                        .then(response => {
                            if (!response.ok) {
                                throw new Error('Broadcast auth failed');
                            }
                            return response.json();
                        })
                        .then(data => {
                            callback(false, data);
                        })
                        .catch(error => {
                            callback(true, error);
                        });
                }
            };
        },
    });

    return echoInstance;
};

/** Disconnect and clear the singleton (call on logout) */
export const disconnectEcho = () => {
    if (echoInstance) {
        echoInstance.disconnect();
        echoInstance = null;
    }
};
