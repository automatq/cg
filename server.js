const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '111825';
const CONTENT_FILE = path.join(__dirname, 'data', 'content.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

// Ensure uploads directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Serve uploaded files
app.use('/uploads', express.static(UPLOADS_DIR));

// Serve static files (index.html, admin.html, etc.)
app.use(express.static(__dirname));

// Multer config for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif|webp|svg/;
        const ext = allowed.test(path.extname(file.originalname).toLowerCase());
        const mime = allowed.test(file.mimetype);
        if (ext && mime) return cb(null, true);
        cb(new Error('Only image files are allowed'));
    }
});

// Auth middleware
function requireAuth(req, res, next) {
    const pw = req.headers['x-admin-password'];
    if (pw !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Unauthorized' });
    }
    next();
}

// ─── API ROUTES ──────────────────────────

// Get content
app.get('/api/content', (req, res) => {
    try {
        const data = JSON.parse(fs.readFileSync(CONTENT_FILE, 'utf8'));
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: 'Failed to read content' });
    }
});

// Update content
app.put('/api/content', requireAuth, (req, res) => {
    try {
        const content = req.body;
        fs.writeFileSync(CONTENT_FILE, JSON.stringify(content, null, 2), 'utf8');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to save content' });
    }
});

// Upload image
app.post('/api/upload', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const url = `/uploads/${req.file.filename}`;
    res.json({ url });
});

// Start server
app.listen(PORT, () => {
    console.log(`\n  🏠 Ciara Gadier CMS Server`);
    console.log(`  ─────────────────────────`);
    console.log(`  Site:   http://localhost:${PORT}`);
    console.log(`  Admin:  http://localhost:${PORT}/admin.html`);
    console.log(`  Password: ${ADMIN_PASSWORD}\n`);
});
