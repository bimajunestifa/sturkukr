import fs from 'fs';
import path from 'path';

// Serverless function to serve binary PNG image for WhatsApp, Telegram, Facebook OpenGraph previews
const TABLE = 'bankidzz_locations';

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
    let logoDataUrl = null;

    // 1. Cek dari memory runtime Vercel
    if (globalThis.__webprofile?.ogImage && globalThis.__webprofile.ogImage.startsWith('data:image')) {
        logoDataUrl = globalThis.__webprofile.ogImage;
    } else if (globalThis.__template?.profileImage && globalThis.__template.profileImage.startsWith('data:image')) {
        logoDataUrl = globalThis.__template.profileImage;
    } else if (globalThis.__webprofile?.favicon && globalThis.__webprofile.favicon.startsWith('data:image')) {
        logoDataUrl = globalThis.__webprofile.favicon;
    }

    // 2. Jika tidak ada di memory, ambil dari Supabase
    if (!logoDataUrl) {
        const sbConfig = getSupabaseConfig();
        if (sbConfig.hasSupabase) {
            try {
                // Cek __config_webprofile__ terlebih dahulu (berisi logo berlatar putih bersih)
                const wResp = await fetch(`${sbConfig.restUrl}?transfer_id=eq.__config_webprofile__&select=photo`, {
                    headers: {
                        apikey: sbConfig.serviceKey,
                        Authorization: `Bearer ${sbConfig.serviceKey}`,
                        'Content-Type': 'application/json'
                    }
                });
                if (wResp.ok) {
                    const rows = await wResp.json();
                    if (Array.isArray(rows) && rows.length > 0 && rows[0].photo) {
                        try {
                            const parsed = JSON.parse(rows[0].photo);
                            if (parsed.ogImage && parsed.ogImage.startsWith('data:image')) {
                                logoDataUrl = parsed.ogImage;
                            } else if (parsed.favicon && parsed.favicon.startsWith('data:image')) {
                                logoDataUrl = parsed.favicon;
                            }
                        } catch(e) {}
                    }
                }

                // Cek __config_template__ jika belum ketemu
                if (!logoDataUrl) {
                    const tResp = await fetch(`${sbConfig.restUrl}?transfer_id=eq.__config_template__&select=photo`, {
                        headers: {
                            apikey: sbConfig.serviceKey,
                            Authorization: `Bearer ${sbConfig.serviceKey}`,
                            'Content-Type': 'application/json'
                        }
                    });
                    if (tResp.ok) {
                        const rows = await tResp.json();
                        if (Array.isArray(rows) && rows.length > 0 && rows[0].photo) {
                            try {
                                const parsed = JSON.parse(rows[0].photo);
                                if (parsed.profileImage && parsed.profileImage.startsWith('data:image')) {
                                    logoDataUrl = parsed.profileImage;
                                }
                            } catch(e) {}
                        }
                    }
                }
            } catch(e) {
                console.warn('Gagal ambil logo untuk og-image:', e.message);
            }
        }
    }

    // 3. Jika ketemu Base64 image dari simpanan admin
    if (logoDataUrl && logoDataUrl.includes('base64,')) {
        try {
            const parts = logoDataUrl.split('base64,');
            const mimeMatch = parts[0].match(/:(.*?);/);
            const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
            const imgBuffer = Buffer.from(parts[1], 'base64');

            res.setHeader('Content-Type', mimeType);
            res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=120');
            return res.status(200).send(imgBuffer);
        } catch(err) {
            console.error('Gagal decode base64 logo:', err);
        }
    }

    // 4. Fallback: Sajikan file logo.png fisik dari disk
    try {
        const logoPath = path.join(process.cwd(), 'logo.png');
        if (fs.existsSync(logoPath)) {
            const fileBuf = fs.readFileSync(logoPath);
            res.setHeader('Content-Type', 'image/png');
            res.setHeader('Cache-Control', 'public, max-age=120, s-maxage=300');
            return res.status(200).send(fileBuf);
        }
    } catch(fsErr) {
        console.warn('Gagal baca logo.png lokal:', fsErr);
    }

    // 5. Fallback minimal 1x1 transparent jika tidak ada file
    const transparentGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
    res.setHeader('Content-Type', 'image/gif');
    return res.status(200).send(transparentGif);
}
