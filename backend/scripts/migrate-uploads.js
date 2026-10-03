require('dotenv').config();

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const Message = require('../src/models/message.model');
const { cloudinary } = require('../src/config/cloudinary');

const uploadDir = path.join(__dirname, '../uploads');

async function main() {
    await mongoose.connect(process.env.MONGO_URI);
    const files = fs.readdirSync(uploadDir).filter(f => !f.startsWith('.'));
    console.log(`Found ${files.length} local file(s)`);

    for (const file of files) {
        const localUrl = `/uploads/${file}`;
        const used = await Message.countDocuments({ 'attachment.url': localUrl });

        if (used === 0) {
            console.log(`skip   ${file} (no message uses it)`);
            continue;
        }

        const result = await cloudinary.uploader.upload(path.join(uploadDir, file), {
            folder: 'unsent/legacy',
            resource_type: 'auto',
            use_filename: true,
            unique_filename: true
        });

        await Message.updateMany(
            { 'attachment.url': localUrl },
            {
                $set: {
                    'attachment.url': result.secure_url,
                    'attachment.publicId': result.public_id,
                    'attachment.resourceType': result.resource_type
                }
            }
        );

        console.log(`moved  ${file} -> ${result.secure_url} (${used} message(s))`);
    }

    await mongoose.disconnect();
    console.log('Done. Verify in the app, then delete backend/uploads.');
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});