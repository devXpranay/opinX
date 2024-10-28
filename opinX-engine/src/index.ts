import { processedMessage } from "./globalVariables.variable";
import { processOrder } from "./processOrder";
import { client, pubsubclient } from "./talkToRedis";


async function startEngine () {
    try {
        await client.connect();
        client.on('error', (err) => {
            console.log('Error ' + err);
        });
        await pubsubclient.connect();
        pubsubclient.on('error', (err) => {
            console.log('Error ' + err);
        });

        while(true) {
            try {
                const message: processedMessage | undefined = await processOrder('unProcessedQueue');
                if(message) {
                    await pubsubclient.publish('backend', JSON.stringify(message.success));
                }
            }
            catch(e) {
                console.error('Error in order processing', e)
                await pubsubclient.publish('backend', JSON.stringify(false));
            }
        }
    }
    catch(e) {

    }
}
startEngine();
