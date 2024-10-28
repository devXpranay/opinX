import { createClient } from 'redis';

const client = createClient();
client.on('error', (err) => {
    console.log("Redis client error " + err);
});
client.on('connect', () => {
    console.log("Redis client connected");
});

export const retrieveHead = async (queueName: string): Promise<any> => {
    try {
        if(!queueName) return "required fields missing";
        const tailElement: { key: string; element: string; } | null = await client.brPop(queueName, 0);
        if(!tailElement) return "queue is empty";
        return tailElement;
    }
    catch(e) {
        return e;
    }
}

export const insertTail = async (queueName: string, message: string): Promise<any> => {
    try {
        if(!queueName || !message) return "required fields missing";
        await client.lPush(queueName, message);
    }
    catch(e) {
        return e;
    }
}