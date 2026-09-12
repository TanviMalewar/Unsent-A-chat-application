const express = require('express');
const upload = require('../middlewares/upload.middleware');
const { uploadFile } = require('../controllers/upload.controller');

const router = express.Router();

router.post('/file', upload.single('file'), uploadFile);

module.exports = router;