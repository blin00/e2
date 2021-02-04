import * as express from 'express';
import * as http from 'http';
import * as socket_io from 'socket.io';
import { PlayerState } from '../types';

const app = express();

app.use(express.static('public'));

const port = process.env.PORT || 3939;
const server = http.createServer(app);
const io = new socket_io.Server(server, {});

let globalState: PlayerState | null = null;
let numClients: number = 0;

io.on('connection', (socket: socket_io.Socket) => {
    console.log(`client connect: ${socket.id}`);
    numClients++;
    console.log(`clients: ${numClients}`);
    socket.on('pushState', (newState: PlayerState) => {
        console.log('updating state: %j', newState);
        socket.broadcast.emit('state', newState);
        globalState = newState;
    });
    socket.on('timesync', (data: any) => {
        socket.emit('timesync', {
            id: data?.id,
            result: Date.now(),
        });
    });
    socket.on('disconnect', (reason: string) => {
        console.log(`client disconnect: ${socket.id}, ${reason}`);
        numClients--;
        console.log(`clients: ${numClients}`);
    });
    socket.emit('state', globalState);
});

server.listen(port, () => console.log(`server listening on port: ${port}`));
