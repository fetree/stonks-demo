// webPush.ts

import webPush from 'web-push';
import dotenv from 'dotenv';

dotenv.config();

webPush.setVapidDetails(
    'mailto:dvdeisenbaum617@gmail.com',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!
);

export const sendWebPushNotification = async (subscription: any, title: string, body: string) => {
    const payload = JSON.stringify({
        notification: {
            title,
            body,
        },
    });

    try {
        await webPush.sendNotification(subscription, payload);
    } catch (error) {
        console.error('Error sending notification:', error);
    }
};
