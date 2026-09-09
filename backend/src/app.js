const express = require("express");
const path = require('path');
const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const authMiddleware = require("./middlewares/auth.middleware");
const messageRoutes = require("./routes/message.routes");

const app = express();

app.use(express.json());

// Serve NEW frontend folder at root
app.use(express.static(path.join(__dirname, '../../frontend')));

// Keep OLD app accessible (just in case)
app.use('/old', express.static(path.join(__dirname, 'public')));

// Routes
app.use("/auth", authRoutes);
app.use("/rooms", authMiddleware, roomRoutes);
app.use("/rooms/:id", authMiddleware, messageRoutes);

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../frontend', 'index.html'));
});

module.exports = app;