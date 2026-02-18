// api/upload.js — Vercel serverless function
// Handles POST /api/upload — uploads image to Cloudinary
// Requires: CLOUDINARY_CLOUD_NAME + CLOUDINARY_UPLOAD_PRESET env vars

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '111825';
const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.CLOUDINARY_UPLOAD_PRESET;

// Vercel has a 4.5MB body limit by default; increase via config below
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-password');
    if (req.method === 'OPTIONS') return res.status(200).end();

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    // Auth
    if (req.headers['x-admin-password'] !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!CLOUD_NAME || !UPLOAD_PRESET) {
        return res.status(503).json({
            error: 'Image uploads not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET in Vercel environment variables.'
        });
    }

    try {
        // req.body should be { image: 'data:image/...;base64,...' }
        const { image } = req.body;
        if (!image) return res.status(400).json({ error: 'No image provided' });

        const formData = new URLSearchParams();
        formData.append('file', image);
        formData.append('upload_preset', UPLOAD_PRESET);

        const r = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, {
            method: 'POST',
            body: formData
        });

        if (!r.ok) {
            const err = await r.json();
            throw new Error(err.error?.message || 'Cloudinary upload failed');
        }

        const data = await r.json();
        return res.status(200).json({ url: data.secure_url });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
};
