const express = require("express");
const path=require("path");
const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes");
const authMiddleware = require("./middlewares/auth.middleware");
const messageRoutes = require("./routes/message.routes");

const app = express();

app.use(express.static(path.join(__dirname, 'public')));

app.use(express.json());

app.use("/auth", authRoutes);
app.use("/rooms", authMiddleware, roomRoutes);
app.use("/rooms/:id", authMiddleware, messageRoutes);

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

module.exports = app;