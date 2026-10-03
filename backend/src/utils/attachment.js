function sanitizeAttachment(att, userId) {
    if (!att || typeof att !== 'object') return null;

    const urlPrefix = `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME}/`;
    const idPrefix = `unsent/${userId}/`;

    if (typeof att.url !== 'string' || !att.url.startsWith(urlPrefix)) return null;
    if (typeof att.publicId !== 'string' || !att.publicId.startsWith(idPrefix)) return null;

    return {
        url: att.url,
        publicId: att.publicId,
        resourceType: ['image', 'raw', 'video'].includes(att.resourceType) ? att.resourceType : 'image',
        filename: String(att.filename || 'file').slice(0, 255),
        type: String(att.type || '').slice(0, 100),
        size: Number(att.size) || 0
    };
}

module.exports = { sanitizeAttachment };