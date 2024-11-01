import { messageFromPubSub } from "../globalVariables.variable";
import { pubsubclient } from "../utils/talkToRedis";


export const pendingRequests = new Map<string, (message: messageFromPubSub) => void>();

export const subscribeToPubsub = async () => {
    pubsubclient.subscribe('pubsub', (pubMessage: string) => {
        const messageData: messageFromPubSub = JSON.parse(pubMessage);
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