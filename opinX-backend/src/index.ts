import express, { Application } from 'express';
import eventRoutes from './routes/eventRoutes';
import userRoutes from './routes/userRoutes';
import dotenv from 'dotenv';
import transactionRoutes from './routes/transactionRoutes';
import { client, pubsubclient } from './utils/talkToRedis';


dotenv.config();
const app: Application = express();

app.use(express.json());

app.use('/api/event', eventRoutes);
app.use('/api/user', userRoutes);
app.use('/api/transact', transactionRoutes)

const PORT = process.env.PORT || 5000;

async function startServer() {
    try {
        await client.connect();
        await pubsubclient.connect();
        client.on('error', (err) => {
            console.log("Redis client error " + err);
        });
        pubsubclient.on('error', (err) => {
            console.log("Redis Pub/Sub client error: " + err);
        });
        // await client.set('users', JSON.stringify({}));
        // await client.set('events', JSON.stringify({}));
        
         
        app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

        app.on('close', async () => {
            await client.quit();
            await pubsubclient.quit();
        });
    }
    catch(e) {
        console.error("Failed to start server", e);
    }
}
startServer();
