const { uploadBuffer } = require('../config/cloudinary');

const uploadFile = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const result = await uploadBuffer(req.file.buffer, {
            // one folder per user, so we can later verify who owns a file
            folder: `unsent/${req.user._id}`,
            resource_type: 'auto'
        });

        res.status(201).json({
            message: 'File uploaded successfully',
            file: {
                url: result.secure_url,
                publicId: result.public_id,
                resourceType: result.resource_type, // image | raw | video
                filename: req.file.originalname,
                type: req.file.mimetype,
                size: req.file.size
            }
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'File upload failed' });
    }
};

module.exports = { uploadFile };