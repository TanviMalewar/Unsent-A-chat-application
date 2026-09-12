const express = require("express");
const path = require('path');
const cors = require('cors');
const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const { authenticateToken } = require("./middlewares/auth.middleware");
const messageRoutes = require("./routes/message.routes");
const uploadRoutes = require('./routes/upload.routes');

const app = express();

app.use(cors({
    origin: 'http://localhost:3001', // Frontend port
    credentials: true
}));

app.use(express.json());

// Serve NEW frontend folder at root
app.use(express.static(path.join(__dirname, '../../frontend')));

// Keep OLD app accessible (just in case)
app.use('/old', express.static(path.join(__dirname, 'public')));

// Routes
app.use("/auth", authRoutes);
app.use("/rooms", authenticateToken, roomRoutes);
app.use("/rooms/:id", authenticateToken, messageRoutes);
app.use('/api/upload', authenticateToken, uploadRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

module.exports = app;