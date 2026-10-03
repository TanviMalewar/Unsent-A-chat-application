const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

// Upload an in-memory buffer (from multer.memoryStorage) to Cloudinary
function uploadBuffer(buffer, options = {}) {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(options, (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
        stream.end(buffer);
    });
}

// Delete a file. PDFs/images are resourceType "image", .txt etc. are "raw".
async function deleteFile(publicId, resourceType = 'image') {
    if (!publicId) return;
    try {
        await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
    } catch (err) {
        console.error('Cloudinary delete failed:', err.message);
    }
}

module.exports = { cloudinary, uploadBuffer, deleteFile };