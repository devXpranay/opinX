import WebSocket from 'ws';
import { messageToQueue } from './globalVarialbes.variable';

export const wss = new WebSocket.Server({ port: 8080 });

export const connect = wss.on('connection', function connection(ws) {
  ws.on('error', console.error);

  ws.on('message', function message(data: messageToQueue) {
    broadcast(data);
  });

  ws.send('Hello! Message From Server!!');
});

export const broadcast = (data: messageToQueue) => {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
};

