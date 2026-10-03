require("dotenv").config();
// SAFETY GUARD: Prevent tests from touching non-test DBs
if (process.env.NODE_ENV === 'test') {
    const uri = process.env.MONGODB_URI || '';
    const dbNameMatch = uri.match(/\.net\/([^?]+)/);
    const dbName = dbNameMatch ? dbNameMatch[1] : '';
    
    if (!dbName.includes('test')) {
        console.error('FATAL: Refusing to run tests against non-test database!');
        console.error('Database name:', dbName);
        console.error('Test DBs must contain "test" in the name.');
        process.exit(1);
    }
    
    console.log('Test environment detected — DB:', dbName);
}

const app = require("./src/app");
const connectToDB = require("./src/config/db");
const http = require('http'); 
const socketIO = require('socket.io'); 
const {setupSocketHandlers} = require("./src/sockets/socket.handler")

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

        setupSocketHandlers(io);

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