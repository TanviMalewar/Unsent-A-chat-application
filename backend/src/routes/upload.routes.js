const express = require('express');
const upload = require('../middlewares/upload.middleware');
const { uploadFile } = require('../controllers/upload.controller');

const router = express.Router();

// Wrap multer so its errors (too large, wrong type) come back as clean JSON
const handleUpload = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (!err) return next();
        const message = err.code === 'LIMIT_FILE_SIZE'
            ? 'File is too large (max 10 MB)'
            : err.message;
        res.status(400).json({ message });
    });
};

router.post('/file', handleUpload, uploadFile);

module.exports = router;