import { pubsubclient } from "../utils/talkToRedis";


export const pendingRequests = new Map<string, (message: any) => void>();

export const subscribeToPubsub = async () => {
    pubsubclient.subscribe('pubsub', (pubMessage: any) => {
        const messageData: any = JSON.parse(pubMessage);
        const requestId = messageData.requestId;
        if (pendingRequests.has(requestId)) {
        const resolve = pendingRequests.get(requestId);
        if (resolve) {
            resolve(messageData);
            pendingRequests.delete(requestId);
        }
        }
    });
}