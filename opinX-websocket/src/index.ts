import { retrieveHead } from "./talkToRedis";
import { broadcast } from "./ws-connection";

(async () => {
    while(true) {
        try {
            const message: string | null = await retrieveHead('processedQueue');
            if(!message) return;
            const messageToBroadcast = JSON.parse(message as string);
            broadcast(messageToBroadcast);
        } catch (error) {
            console.error('Error in order processing:', error);
        }
    }
})();