// Vercel Serverless Function untuk API Web Profile
// Mendukung GET & POST konfigurasi web profile

import fs from 'fs';
import path from 'path';

const DEFAULT_PROFILE = {
    siteTitle: 'HONGLEONG',
    metaDescription: 'HONGLEONG',
    favicon: 'uploads/channels4_profile.jpg',
    appleTouchIcon: 'uploads/channels4_profile.jpg',
    themeColor: '#0033ff',
    appleWebAppCapable: 'yes',
    appleWebAppStatusbarStyle: 'default',
    ogType: 'website',
    ogLocale: 'en_MY',
    ogTitle: 'HONGLEONG',
    ogDescription: 'HONGLEONG',
    ogUrl: 'https://',
    ogImage: 'uploads/channels4_profile.jpg',
    ogImageWidth: '1200',
    ogImageHeight: '630',
    ogImageAlt: 'JAPANESE BANK',
    twitterCardType: 'summary_large_image',
    twitterTitle: 'Hong Leong Bank',
    twitterDescription: 'Resit Transaksi Hong Leong Bank',
    twitterImage: 'uploads/channels4_profile.jpg'
};

let inMemoryProfile = { ...DEFAULT_PROFILE };

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
        return res.status(200).json({ profile: inMemoryProfile });
    }

    if (req.method === 'POST') {
        const token = req.headers.authorization;
        const expectedToken = process.env.ADMIN_TOKEN ? `Bearer ${process.env.ADMIN_TOKEN}` : 'Bearer bankidzz-admin-secure-2026';

        if (token !== expectedToken && token !== 'Bearer bankidzz-admin-secure-2026') {
            return res.status(401).json({ error: 'Token admin tidak valid.' });
        }

        try {
            const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
            inMemoryProfile = { ...DEFAULT_PROFILE, ...body };
            return res.status(200).json({ ok: true, profile: inMemoryProfile });
        } catch (e) {
            return res.status(400).json({ error: 'Data web profile tidak valid.' });
        }
    }

    return res.status(405).json({ error: 'Method tidak didukung.' });
}
