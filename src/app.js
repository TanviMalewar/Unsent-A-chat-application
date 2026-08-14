const express = require("express");
const authRoutes = require("./routes/auth.routes");
const roomRoutes = require("./routes/room.routes"); // Add this
const authMiddleware = require("./middlewares/auth.middleware");

const app = express();

app.use(express.json());
app.use("/auth", authRoutes);

// Add room routes (protected by authentication)
app.use("/rooms", authMiddleware, roomRoutes); // Add this

app.get("/health", (req, res) => {
    res.status(200).json({
        status: "ok"
    });
});

module.exports = app;