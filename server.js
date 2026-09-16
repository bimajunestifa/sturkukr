// Simple Node.js Server untuk Testing Lokal Bankidzz
// Jalankan: node server.js

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const TEMPLATE_FILE = path.join(__dirname, 'template.json');

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
                    
                    // Hapus duplikat
                    const filtered = data.filter(t => t.transferId !== payload.transferId);
                    filtered.push(payload);
                    
                    writeData(filtered);
                    
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
