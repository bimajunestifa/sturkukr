// ============================================================
// BANK NEGARA MALAYSIA - ADMIN DASHBOARD
// DIBUAT OLEH KAIZEN
// ============================================================

(function() {
    'use strict';

    // State
    let transfers = [];
    let currentLocation = null;
    let autoRefreshInterval = null;

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
    function loadData() {
        try {
            const stored = localStorage.getItem('bnm_transfers');
            if (stored) {
                transfers = JSON.parse(stored);
            } else {
                transfers = generateDummyData();
                localStorage.setItem('bnm_transfers', JSON.stringify(transfers));
            }
        } catch(e) {
            transfers = generateDummyData();
        }

        try {
            const loc = localStorage.getItem('bnm_last_location');
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
                transferId: 'BNM-2026-07-25-' + String.fromCharCode(65 + i) + String.fromCharCode(65 + i + 1),
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

    // ===== RENDER TABLE =====
    function renderTable() {
        if (!elements.transTableBody) return;

        if (transfers.length === 0) {
            elements.transTableBody.innerHTML = `
                <tr><td colspan="7" style="text-align:center; padding:40px; color:#555577;">
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

            html += `
                <tr>
                    <td><strong style="font-size:12px;">${t.transferId}</strong></td>
                    <td>${t.sender}</td>
                    <td>${t.receiver}</td>
                    <td>${t.amount || 'RM -'}</td>
                    <td><span class="status-pill ${statusClass}">${statusText}</span></td>
                    <td>
                        ${hasLocation ? '📍 ' + t.location.lat.toFixed(5) + ', ' + t.location.lng.toFixed(5) : '⏳ Menunggu'}
                    </td>
                    <td>
                        ${hasLocation ? `<button class="btn-view-map" onclick="viewLocation('${t.transferId}')">🗺️ Lihat</button>` : '-'}
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

        // Show map
        elements.mapPlaceholder.style.display = 'none';
        elements.mapFrame.style.display = 'block';

        // Google Maps embed
        const mapsUrl = `https://www.google.com/maps/embed/v1/place?key=AIzaSyB4Rl3B-7Tk9e6Q8wXzY5A2cD3fG1hJ2kL&q=${lat},${lng}&zoom=16`;
        elements.mapFrame.src = mapsUrl;

        // Update details
        elements.locLat.textContent = lat.toFixed(6);
        elements.locLng.textContent = lng.toFixed(6);
        elements.locAcc.textContent = accuracy ? accuracy.toFixed(0) + 'm' : '~';
        elements.locTime.textContent = timestamp ? new Date(timestamp).toLocaleString('ms-MY') : new Date().toLocaleString('ms-MY');

        elements.locStatus.textContent = '✅ Aktif';
        elements.locStatus.className = 'loc-status active';

        // Reverse geocoding
        fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=16`)
            .then(res => res.json())
            .then(data => {
                if (data && data.display_name) {
                    elements.locAddress.textContent = data.display_name;
                } else {
                    elements.locAddress.textContent = '📍 Lokasi: ' + lat.toFixed(4) + ', ' + lng.toFixed(4);
                }
            })
            .catch(() => {
                elements.locAddress.textContent = '📍 Lokasi: ' + lat.toFixed(4) + ', ' + lng.toFixed(4);
            });

        // Open maps button
        elements.openMapsBtn.onclick = function() {
            window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
        };
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

    // ===== EVENT LISTENERS =====
    elements.refreshMapBtn.addEventListener('click', refreshAll);
    elements.refreshTableBtn.addEventListener('click', refreshAll);

    // Storage changes
    window.addEventListener('storage', function(e) {
        if (e.key === 'bnm_transfers' || e.key === 'bnm_last_location') {
            loadData();
        }
    });

    // ===== INIT =====
    loadData();
    updateClock();
    setInterval(updateClock, 1000);
    setInterval(refreshAll, 8000);

    console.log('[BNM] Admin dashboard ready');
    console.log('[BNM] Transfers loaded:', transfers.length);

})();