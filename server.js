require("dotenv").config();

const app = require("./src/app");
const connectToDB = require("./src/config/db");
const http = require('http'); 
const socketIO = require('socket.io'); 

const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        await connectToDB();

        const server = http.createServer(app); 

        const io = socketIO(server, {
            cors: {
                origin: '*',
                methods: ['GET', 'POST'],
                credentials:true
            },
            transports: ['websocket', 'polling'],
            allowEIO3: true 
        });

        io.on('connection', (socket) => {
            console.log(`User connected: ${socket.id}`);

            socket.on('disconnect', () => {
                console.log(`User disconnected: ${socket.id}`);
            });
        });

        server.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
            console.log(`Socket.io ready for connections`);
        });

    } catch (err) {
        console.error('Server startup error:', err.message);
        process.exit(1);
    }
}

startServer();