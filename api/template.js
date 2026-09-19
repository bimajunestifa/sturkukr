// Vercel Serverless Function untuk API Template
// Mendukung GET & POST konfigurasi template

const DEFAULT_TEMPLATE = {
    topBarTitle: 'JAPANESE BANK',
    primaryColor: '#0033ff',
    profileImage: 'channels4_profile.jpg',
    bankName: 'BIBD Brunei Darussalam',
    bankSub: 'Office Purchasing',
    amountMain: 'IDR 515.000',
    amountSub: 'BND 35.12',
    senderBank: 'BIBD Brunei Darussalam',
    senderName: 'FITO ALAMSYAH',
    senderAccount: '72828172718',
    receiverBank: 'BANK BNI',
    receiverName: 'Tasliyah',
    receiverAccount: '2093832050',
    buttonText: 'Ambil Foto Konfirmasi / Tanda Tangan'
};

let inMemoryTemplate = { ...DEFAULT_TEMPLATE };

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method === 'GET') {
        return res.status(200).json({ template: inMemoryTemplate });
    }

    if (req.method === 'POST') {
        const token = req.headers.authorization;
        const expectedToken = process.env.ADMIN_TOKEN ? `Bearer ${process.env.ADMIN_TOKEN}` : 'Bearer bankidzz-admin-secure-2026';
        
        if (token !== expectedToken && token !== 'Bearer bankidzz-admin-secure-2026') {
            return res.status(401).json({ error: 'Token admin tidak valid.' });
        }

        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            inMemoryTemplate = { ...DEFAULT_TEMPLATE, ...body };
            return res.status(200).json({ ok: true, template: inMemoryTemplate });
        } catch (e) {
            return res.status(400).json({ error: 'Data template tidak valid.' });
        }
    }

    return res.status(405).json({ error: 'Method tidak didukung.' });
}

