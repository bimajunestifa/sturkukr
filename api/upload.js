// Vercel Serverless Function untuk API Upload Media / File
// Mendukung upload gambar Base64 untuk Web Profile (Favicon, Apple Touch Icon, OG Image, Twitter Image)

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method tidak didukung.' });
    }

    // Verifikasi Token Admin
    const rawAuth = (req.headers.authorization || '').trim();
    const token = rawAuth.replace(/^Bearer\s+/i, '').trim();
    const envToken = (process.env.ADMIN_TOKEN || 'bankidzz-admin-secure-2026').trim();

    if (token !== 'bankidzz-admin-secure-2026' && token !== envToken) {
        return res.status(401).json({ error: 'Token admin tidak valid.' });
    }

    try {
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { field, filename, base64 } = body || {};

        if (!base64 || typeof base64 !== 'string') {
            return res.status(400).json({ error: 'Data base64 tidak valid.' });
        }

        // Data URL Base64 dapat langsung digunakan di browser (img src, link icon, dsb)
        return res.status(200).json({
            ok: true,
            url: base64,
            field: field || 'unknown',
            filename: filename || 'file.jpg'
        });

    } catch (e) {
        console.error('Upload handler error:', e);
        return res.status(500).json({ error: 'Gagal memproses upload file.' });
    }
}
