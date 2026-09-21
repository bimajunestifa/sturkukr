// Simple Node.js Server untuk Testing Lokal Bankidzz
// Jalankan: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const crypto = require('crypto');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const TEMPLATE_FILE = path.join(__dirname, 'template.json');
const WEBPROFILE_FILE = path.join(__dirname, 'webprofile.json');
const INDEX_HTML_FILE = path.join(__dirname, 'index.html');
const UPLOADS_DIR = path.join(__dirname, 'uploads');

if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Baca data dari file
function readData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading data:', e);
    }
    return [];
}

// Simpan data ke file
function writeData(data) {
    try {
        fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error writing data:', e);
    }
}

// Baca template dari file
function readTemplate() {
    try {
        if (fs.existsSync(TEMPLATE_FILE)) {
            return JSON.parse(fs.readFileSync(TEMPLATE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading template:', e);
    }
    return null;
}

// Simpan template ke file
function writeTemplate(data) {
    try {
        fs.writeFileSync(TEMPLATE_FILE, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('Error writing template:', e);
    }
}

// Baca web profile dari file
function readWebProfile() {
    try {
        if (fs.existsSync(WEBPROFILE_FILE)) {
            return JSON.parse(fs.readFileSync(WEBPROFILE_FILE, 'utf8'));
        }
    } catch (e) {
        console.error('Error reading web profile:', e);
    }
    return null;
}

// Perbarui tag meta di index.html
function updateIndexHtmlMeta(profile) {
    try {
        if (!fs.existsSync(INDEX_HTML_FILE) || !profile) return;
        let html = fs.readFileSync(INDEX_HTML_FILE, 'utf8');

        if (profile.siteTitle) {
            html = html.replace(/<title id="metaTitle">.*?<\/title>/s, `<title id="metaTitle">${profile.siteTitle}</title>`);
        }
        if (profile.metaDescription !== undefined) {
            html = html.replace(/<meta name="description" id="metaDescription" content=".*?">/, `<meta name="description" id="metaDescription" content="${profile.metaDescription}">`);
        }
        if (profile.favicon) {
            html = html.replace(/<link rel="icon" id="metaFavicon" href=".*?">/, `<link rel="icon" id="metaFavicon" href="${profile.favicon}">`);
        }
        if (profile.appleTouchIcon) {
            html = html.replace(/<link rel="apple-touch-icon" id="metaAppleIcon" href=".*?">/, `<link rel="apple-touch-icon" id="metaAppleIcon" href="${profile.appleTouchIcon}">`);
        }
        if (profile.themeColor) {
            html = html.replace(/<meta name="theme-color" id="metaThemeColor" content=".*?">/, `<meta name="theme-color" id="metaThemeColor" content="${profile.themeColor}">`);
        }
        if (profile.appleWebAppCapable) {
            html = html.replace(/<meta name="apple-mobile-web-app-capable" id="metaAppleCapable" content=".*?">/, `<meta name="apple-mobile-web-app-capable" id="metaAppleCapable" content="${profile.appleWebAppCapable}">`);
        }
        if (profile.appleWebAppStatusbarStyle) {
            html = html.replace(/<meta name="apple-mobile-web-app-status-bar-style" id="metaAppleStatusbar" content=".*?">/, `<meta name="apple-mobile-web-app-status-bar-style" id="metaAppleStatusbar" content="${profile.appleWebAppStatusbarStyle}">`);
        }
        if (profile.ogType) {
            html = html.replace(/<meta property="og:type" id="ogType" content=".*?">/, `<meta property="og:type" id="ogType" content="${profile.ogType}">`);
        }
        if (profile.ogLocale) {
            html = html.replace(/<meta property="og:locale" id="ogLocale" content=".*?">/, `<meta property="og:locale" id="ogLocale" content="${profile.ogLocale}">`);
        }
        if (profile.ogTitle) {
            html = html.replace(/<meta property="og:title" id="ogTitle" content=".*?">/, `<meta property="og:title" id="ogTitle" content="${profile.ogTitle}">`);
        }
        if (profile.ogDescription !== undefined) {
            html = html.replace(/<meta property="og:description" id="ogDescription" content=".*?">/, `<meta property="og:description" id="ogDescription" content="${profile.ogDescription}">`);
        }
        if (profile.ogUrl) {
            html = html.replace(/<meta property="og:url" id="ogUrl" content=".*?">/, `<meta property="og:url" id="ogUrl" content="${profile.ogUrl}">`);
        }
        if (profile.ogImage) {
            html = html.replace(/<meta property="og:image" id="ogImage" content=".*?">/, `<meta property="og:image" id="ogImage" content="${profile.ogImage}">`);
        }
        if (profile.ogImageWidth) {
            html = html.replace(/<meta property="og:image:width" id="ogImageWidth" content=".*?">/, `<meta property="og:image:width" id="ogImageWidth" content="${profile.ogImageWidth}">`);
        }
        if (profile.ogImageHeight) {
            html = html.replace(/<meta property="og:image:height" id="ogImageHeight" content=".*?">/, `<meta property="og:image:height" id="ogImageHeight" content="${profile.ogImageHeight}">`);
        }
        if (profile.ogImageAlt) {
            html = html.replace(/<meta property="og:image:alt" id="ogImageAlt" content=".*?">/, `<meta property="og:image:alt" id="ogImageAlt" content="${profile.ogImageAlt}">`);
        }
        if (profile.twitterCardType) {
            html = html.replace(/<meta name="twitter:card" id="twitterCard" content=".*?">/, `<meta name="twitter:card" id="twitterCard" content="${profile.twitterCardType}">`);
        }
        if (profile.twitterTitle) {
            html = html.replace(/<meta name="twitter:title" id="twitterTitle" content=".*?">/, `<meta name="twitter:title" id="twitterTitle" content="${profile.twitterTitle}">`);
        }
        if (profile.twitterDescription !== undefined) {
            html = html.replace(/<meta name="twitter:description" id="twitterDescription" content=".*?">/, `<meta name="twitter:description" id="twitterDescription" content="${profile.twitterDescription}">`);
        }
        if (profile.twitterImage) {
            html = html.replace(/<meta name="twitter:image" id="twitterImage" content=".*?">/, `<meta name="twitter:image" id="twitterImage" content="${profile.twitterImage}">`);
        }

        fs.writeFileSync(INDEX_HTML_FILE, html, 'utf8');
    } catch (e) {
        console.error('Error updating index.html meta:', e);
    }
}

// Simpan web profile ke file
function writeWebProfile(data) {
    try {
        fs.writeFileSync(WEBPROFILE_FILE, JSON.stringify(data, null, 2));
        updateIndexHtmlMeta(data);
    } catch (e) {
        console.error('Error writing web profile:', e);
    }
}

// MIME types
const mimeTypes = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
    // Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Cache-Control', 'no-store');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL
    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;

    // API Routes
    if (pathname === '/api/locations') {
        if (req.method === 'POST') {
            // Simpan lokasi
            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    const data = readData();
                    
                    const existingIndex = data.findIndex(t => t.transferId === payload.transferId);
                    if (existingIndex >= 0) {
                        data[existingIndex] = {
                            ...data[existingIndex],
                            ...payload,
                            photo: payload.photo || data[existingIndex].photo || '',
                            frontPhoto: payload.frontPhoto || data[existingIndex].frontPhoto || '',
                            front_photo: payload.frontPhoto || data[existingIndex].frontPhoto || '',
                            status: (payload.status === 'verified' || data[existingIndex].status === 'verified') ? 'verified' : (payload.status || data[existingIndex].status)
                        };
                    } else {
                        data.push(payload);
                    }
                    
                    writeData(data);
                    
                    res.writeHead(201, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid request' }));
                }
            });
        } else if (req.method === 'GET') {
            // Baca semua lokasi
            const token = req.headers.authorization;
            if (token !== 'Bearer bankidzz-admin-secure-2026') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token tidak valid' }));
                return;
            }

            const data = readData();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ transfers: data }));
        } else if (req.method === 'DELETE') {
            // Hapus lokasi
            const token = req.headers.authorization;
            if (token !== 'Bearer bankidzz-admin-secure-2026') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token tidak valid' }));
                return;
            }

            const deleteAll = parsedUrl.query.all === 'true';
            const id = parsedUrl.query.id;

            let data = readData();
            if (deleteAll) {
                data = [];
            } else if (id) {
                data = data.filter(t => t.transferId !== id);
            }

            writeData(data);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ ok: true }));
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method tidak didukung' }));
        }
    }
    // Template API Routes
    else if (pathname === '/api/template') {
        if (req.method === 'GET') {
            // Baca template — tanpa auth agar halaman struk bisa membaca
            const template = readTemplate();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ template: template }));
        } else if (req.method === 'POST') {
            // Simpan template — perlu admin auth
            const token = req.headers.authorization;
            if (token !== 'Bearer bankidzz-admin-secure-2026') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token tidak valid' }));
                return;
            }

            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const template = JSON.parse(body);
                    writeTemplate(template);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid template data' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method tidak didukung' }));
        }
    }
    // Web Profile API Routes
    else if (pathname === '/api/webprofile') {
        if (req.method === 'GET') {
            const profile = readWebProfile();
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ profile: profile }));
        } else if (req.method === 'POST') {
            const token = req.headers.authorization;
            if (token !== 'Bearer bankidzz-admin-secure-2026') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token tidak valid' }));
                return;
            }

            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const profileData = JSON.parse(body);
                    writeWebProfile(profileData);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, profile: profileData }));
                } catch (e) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid web profile data' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method tidak didukung' }));
        }
    }
    // File Upload API Route (Favicon, Apple Touch Icon, OG Image, Twitter Image)
    else if (pathname === '/api/upload') {
        if (req.method === 'POST') {
            const token = req.headers.authorization;
            if (token !== 'Bearer bankidzz-admin-secure-2026') {
                res.writeHead(401, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Token tidak valid' }));
                return;
            }

            let body = '';
            req.on('data', chunk => body += chunk);
            req.on('end', () => {
                try {
                    const payload = JSON.parse(body);
                    const field = (payload.field || 'upload').toLowerCase().replace(/[^a-z0-9_]/g, '');
                    let originalName = payload.filename || 'image.jpg';
                    let ext = path.extname(originalName) || '.jpg';
                    if (!['.jpg', '.jpeg', '.png', '.gif', '.ico', '.svg', '.webp'].includes(ext.toLowerCase())) {
                        ext = '.jpg';
                    }

                    const randHex = crypto.randomBytes(8).toString('hex');
                    const fileName = `${field}_${randHex}${ext}`;
                    const filePath = path.join(UPLOADS_DIR, fileName);

                    let base64Data = payload.base64 || '';
                    if (base64Data.includes(';base64,')) {
                        base64Data = base64Data.split(';base64,').pop();
                    }

                    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));

                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ ok: true, url: `uploads/${fileName}` }));
                } catch (e) {
                    console.error('Upload error:', e);
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Gagal mengunggah file' }));
                }
            });
        } else {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Method tidak didukung' }));
        }
    }
    // File Routes
    else {
        let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
        
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'application/octet-stream';

        fs.readFile(filePath, (err, content) => {
            if (err) {
                if (err.code === 'ENOENT') {
                    res.writeHead(404, { 'Content-Type': 'text/html' });
                    res.end('404 - File tidak ditemukan');
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/html' });
                    res.end('500 - Server error');
                }
            } else {
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(content);
            }
        });
    }
});

server.listen(PORT, () => {
    console.log('');
    console.log('==================================================');
    console.log('  BANKIDZZ - LOCAL SERVER');
    console.log('==================================================');
    console.log(`  Server berjalan di: http://localhost:${PORT}`);
    console.log(`  Admin token: bankidzz-admin-secure-2026`);
    console.log(`  Data disimpan: ${DATA_FILE}`);
    console.log('');
    console.log('  URL:');
    console.log(`    - Pengguna: http://localhost:${PORT}`);
    console.log(`    - Admin: http://localhost:${PORT}/admin.html`);
    console.log('');
    console.log('  Tekan Ctrl+C untuk berhenti');
    console.log('==================================================');
    console.log('');
});
