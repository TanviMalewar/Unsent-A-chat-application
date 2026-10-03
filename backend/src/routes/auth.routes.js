const express=require('express')
const router=express.Router()

const {register,login,getCurrentUser}=require('../controllers/auth.controller');
const authMiddleware = require('../middlewares/auth.middleware');

router.post("/register", register);

router.post("/login", login);

router.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

module.exports = router;