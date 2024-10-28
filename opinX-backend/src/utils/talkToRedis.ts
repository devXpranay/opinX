import { createClient } from 'redis';

export const client = createClient();
export const pubsubclient = createClient();

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

export const getGlobalVariable = async (key: string): Promise<any> => {
    try {
        if(!key) return "required fields missing";
        const value = await client.get(key);
        if(!value) return "key not found";
        return JSON.parse(value);
    }
    catch(e) {
        return e;
    }
}

export const setGlobalVariable = async (key: string, value: any): Promise<any> => {
    try {
        if(!key || !value) return "required fields missing";
        await client.set(key, JSON.stringify(value));
    }
    catch(e) {
        return e;
    }
}