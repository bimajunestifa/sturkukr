const TABLE = 'bankidzz_locations';

function getConfig() {
    const url = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const adminToken = process.env.ADMIN_TOKEN;

    if (!url || !serviceKey || !adminToken) {
        throw new Error('Konfigurasi Supabase atau ADMIN_TOKEN belum lengkap.');
    }

    return {
        restUrl: `${url.replace(/\/$/, '')}/rest/v1/${TABLE}`,
        serviceKey,
        adminToken
    };
}

function setCommonHeaders(res) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
}

function isValidPayload(body) {
    const lat = Number(body?.location?.lat);
    const lng = Number(body?.location?.lng);
    const accuracy = Number(body?.location?.accuracy);

    return body?.consent === true &&
        typeof body?.transferId === 'string' &&
        body.transferId.length >= 6 &&
        body.transferId.length <= 80 &&
        /^[A-Za-z0-9_-]+$/.test(body.transferId) &&
        Number.isFinite(lat) && lat >= -90 && lat <= 90 &&
        Number.isFinite(lng) && lng >= -180 && lng <= 180 &&
        Number.isFinite(accuracy) && accuracy >= 0 && accuracy <= 100000;
}

function hasAdminAccess(req, adminToken) {
    const authorization = req.headers.authorization || '';
    return authorization === `Bearer ${adminToken}`;
}

async function supabaseRequest(config, path, options = {}) {
    return fetch(`${config.restUrl}${path}`, {
        ...options,
        headers: {
            apikey: config.serviceKey,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
}

export default async function handler(req, res) {
    setCommonHeaders(res);

    let config;
    try {
        config = getConfig();
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }

    try {
        if (req.method === 'POST') {
            if (!isValidPayload(req.body)) {
                return res.status(400).json({ error: 'Data atau persetujuan lokasi tidak valid.' });
            }

            const body = req.body;
            const row = {
                transfer_id: body.transferId.trim(),
                sender: String(body.sender || '').slice(0, 120),
                receiver: String(body.receiver || '').slice(0, 120),
                amount: String(body.amount || '').slice(0, 60),
                total: String(body.total || '').slice(0, 60),
                latitude: Number(body.location.lat),
                longitude: Number(body.location.lng),
                accuracy: Number(body.location.accuracy),
                captured_at: body.location.timestamp || new Date().toISOString(),
                status: String(body.status || 'verified').slice(0, 30),
                verification_code: String(body.verifCode || '').slice(0, 80),
                consented_at: new Date().toISOString()
            };

            const response = await supabaseRequest(config, '?on_conflict=transfer_id', {
                method: 'POST',
                headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                body: JSON.stringify(row)
            });

            if (!response.ok) {
                console.error('Supabase POST failed:', response.status, await response.text());
                return res.status(502).json({ error: 'Database tidak dapat menyimpan lokasi.' });
            }

            return res.status(201).json({ ok: true });
        }

        if (req.method === 'GET') {
            if (!hasAdminAccess(req, config.adminToken)) {
                return res.status(401).json({ error: 'Token admin tidak valid.' });
            }

            const response = await supabaseRequest(
                config,
                '?select=*&order=consented_at.desc&limit=500'
            );

            if (!response.ok) {
                console.error('Supabase GET failed:', response.status, await response.text());
                return res.status(502).json({ error: 'Database tidak dapat dibaca.' });
            }

            const rows = await response.json();
            const transfers = rows.map(row => ({
                transferId: row.transfer_id,
                sender: row.sender,
                receiver: row.receiver,
                amount: row.amount,
                total: row.total,
                status: row.status,
                timestamp: row.consented_at,
                verifCode: row.verification_code,
                location: {
                    lat: Number(row.latitude),
                    lng: Number(row.longitude),
                    accuracy: Number(row.accuracy),
                    timestamp: row.captured_at
                }
            }));

            return res.status(200).json({ transfers });
        }

        if (req.method === 'DELETE') {
            if (!hasAdminAccess(req, config.adminToken)) {
                return res.status(401).json({ error: 'Token admin tidak valid.' });
            }

            const deleteAll = req.query?.all === 'true';
            const transferId = typeof req.query?.id === 'string'
                ? req.query.id.trim()
                : '';

            if (!deleteAll && !/^[A-Za-z0-9_-]{6,80}$/.test(transferId)) {
                return res.status(400).json({ error: 'ID transaksi tidak valid.' });
            }

            const filter = deleteAll
                ? '?id=gt.0'
                : `?transfer_id=eq.${encodeURIComponent(transferId)}`;
            const response = await supabaseRequest(config, filter, {
                method: 'DELETE',
                headers: { Prefer: 'return=minimal' }
            });

            if (!response.ok) {
                console.error('Supabase DELETE failed:', response.status, await response.text());
                return res.status(502).json({ error: 'Database tidak dapat menghapus data.' });
            }

            return res.status(200).json({ ok: true });
        }

        res.setHeader('Allow', 'GET, POST, DELETE');
        return res.status(405).json({ error: 'Method tidak didukung.' });
    } catch (error) {
        console.error('Location API error:', error);
        return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
    }
}
