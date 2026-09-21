<?php
// HELIX WEB PROFILE - Standalone PHP Page & Backend Handler
// Kompatibel dengan XAMPP Apache & PHP Hosting

$dataFile = __DIR__ . '/webprofile.json';
$indexFile = __DIR__ . '/index.html';
$uploadsDir = __DIR__ . '/uploads';

if (!file_exists($uploadsDir)) {
    mkdir($uploadsDir, 0777, true);
}

// Default Data
$defaultProfile = [
    'siteTitle' => 'HONGLEONG',
    'metaDescription' => 'HONGLEONG',
    'favicon' => 'uploads/channels4_profile.jpg',
    'appleTouchIcon' => 'uploads/channels4_profile.jpg',
    'themeColor' => '#0033ff',
    'appleWebAppCapable' => 'yes',
    'appleWebAppStatusbarStyle' => 'default',
    'ogType' => 'website',
    'ogLocale' => 'en_MY',
    'ogTitle' => 'HONGLEONG',
    'ogDescription' => 'HONGLEONG',
    'ogUrl' => 'https://',
    'ogImage' => 'uploads/channels4_profile.jpg',
    'ogImageWidth' => '1200',
    'ogImageHeight' => '630',
    'ogImageAlt' => 'JAPANESE BANK',
    'twitterCardType' => 'summary_large_image',
    'twitterTitle' => 'Hong Leong Bank',
    'twitterDescription' => 'Resit Transaksi Hong Leong Bank',
    'twitterImage' => 'uploads/channels4_profile.jpg'
];

// Load Profile
$profile = $defaultProfile;
if (file_exists($dataFile)) {
    $loaded = json_decode(file_get_contents($dataFile), true);
    if (is_array($loaded)) {
        $profile = array_merge($defaultProfile, $loaded);
    }
}

$message = '';
$messageType = '';

// Handle POST request
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Basic Meta
    $profile['siteTitle'] = $_POST['siteTitle'] ?? $profile['siteTitle'];
    $profile['metaDescription'] = $_POST['metaDescription'] ?? $profile['metaDescription'];
    $profile['themeColor'] = $_POST['themeColor'] ?? $profile['themeColor'];
    $profile['appleWebAppCapable'] = $_POST['appleWebAppCapable'] ?? $profile['appleWebAppCapable'];
    $profile['appleWebAppStatusbarStyle'] = $_POST['appleWebAppStatusbarStyle'] ?? $profile['appleWebAppStatusbarStyle'];

    // Open Graph
    $profile['ogType'] = $_POST['ogType'] ?? $profile['ogType'];
    $profile['ogLocale'] = $_POST['ogLocale'] ?? $profile['ogLocale'];
    $profile['ogTitle'] = $_POST['ogTitle'] ?? $profile['ogTitle'];
    $profile['ogDescription'] = $_POST['ogDescription'] ?? $profile['ogDescription'];
    $profile['ogUrl'] = $_POST['ogUrl'] ?? $profile['ogUrl'];
    $profile['ogImageWidth'] = $_POST['ogImageWidth'] ?? $profile['ogImageWidth'];
    $profile['ogImageHeight'] = $_POST['ogImageHeight'] ?? $profile['ogImageHeight'];
    $profile['ogImageAlt'] = $_POST['ogImageAlt'] ?? $profile['ogImageAlt'];

    // Twitter Card
    $profile['twitterCardType'] = $_POST['twitterCardType'] ?? $profile['twitterCardType'];
    $profile['twitterTitle'] = $_POST['twitterTitle'] ?? $profile['twitterTitle'];
    $profile['twitterDescription'] = $_POST['twitterDescription'] ?? $profile['twitterDescription'];

    // File Uploads & Deletions
    $fileFields = ['favicon', 'appleTouchIcon', 'ogImage', 'twitterImage'];
    foreach ($fileFields as $field) {
        // Hapus file jika dicentang
        if (!empty($_POST['del_' . $field])) {
            $profile[$field] = '';
        }
        
        // Upload file baru jika ada
        if (isset($_FILES[$field]) && $_FILES[$field]['error'] === UPLOAD_ERR_OK) {
            $tmpName = $_FILES[$field]['tmp_name'];
            $origName = basename($_FILES[$field]['name']);
            $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION));
            if (!in_array($ext, ['jpg', 'jpeg', 'png', 'gif', 'ico', 'svg', 'webp'])) {
                $ext = 'jpg';
            }
            $randHex = bin2hex(random_bytes(8));
            $newName = $field . '_' . $randHex . '.' . $ext;
            $destPath = $uploadsDir . '/' . $newName;

            if (move_uploaded_file($tmpName, $destPath)) {
                $profile[$field] = 'uploads/' . $newName;
            }
        }
    }

    // Simpan ke webprofile.json
    file_put_contents($dataFile, json_encode($profile, JSON_PRETTY_PRINT));

    // Perbarui meta tags di index.html
    if (file_exists($indexFile)) {
        $html = file_get_contents($indexFile);
        $html = preg_replace('/<title id="metaTitle">.*?<\/title>/s', '<title id="metaTitle">' . htmlspecialchars($profile['siteTitle']) . '</title>', $html);
        $html = preg_replace('/<meta name="description" id="metaDescription" content=".*?">/', '<meta name="description" id="metaDescription" content="' . htmlspecialchars($profile['metaDescription']) . '">', $html);
        $html = preg_replace('/<link rel="icon" id="metaFavicon" href=".*?">/', '<link rel="icon" id="metaFavicon" href="' . htmlspecialchars($profile['favicon']) . '">', $html);
        $html = preg_replace('/<link rel="apple-touch-icon" id="metaAppleIcon" href=".*?">/', '<link rel="apple-touch-icon" id="metaAppleIcon" href="' . htmlspecialchars($profile['appleTouchIcon']) . '">', $html);
        $html = preg_replace('/<meta name="theme-color" id="metaThemeColor" content=".*?">/', '<meta name="theme-color" id="metaThemeColor" content="' . htmlspecialchars($profile['themeColor']) . '">', $html);
        $html = preg_replace('/<meta name="apple-mobile-web-app-capable" id="metaAppleCapable" content=".*?">/', '<meta name="apple-mobile-web-app-capable" id="metaAppleCapable" content="' . htmlspecialchars($profile['appleWebAppCapable']) . '">', $html);
        $html = preg_replace('/<meta name="apple-mobile-web-app-status-bar-style" id="metaAppleStatusbar" content=".*?">/', '<meta name="apple-mobile-web-app-status-bar-style" id="metaAppleStatusbar" content="' . htmlspecialchars($profile['appleWebAppStatusbarStyle']) . '">', $html);
        $html = preg_replace('/<meta property="og:type" id="ogType" content=".*?">/', '<meta property="og:type" id="ogType" content="' . htmlspecialchars($profile['ogType']) . '">', $html);
        $html = preg_replace('/<meta property="og:locale" id="ogLocale" content=".*?">/', '<meta property="og:locale" id="ogLocale" content="' . htmlspecialchars($profile['ogLocale']) . '">', $html);
        $html = preg_replace('/<meta property="og:title" id="ogTitle" content=".*?">/', '<meta property="og:title" id="ogTitle" content="' . htmlspecialchars($profile['ogTitle']) . '">', $html);
        $html = preg_replace('/<meta property="og:description" id="ogDescription" content=".*?">/', '<meta property="og:description" id="ogDescription" content="' . htmlspecialchars($profile['ogDescription']) . '">', $html);
        $html = preg_replace('/<meta property="og:url" id="ogUrl" content=".*?">/', '<meta property="og:url" id="ogUrl" content="' . htmlspecialchars($profile['ogUrl']) . '">', $html);
        $html = preg_replace('/<meta property="og:image" id="ogImage" content=".*?">/', '<meta property="og:image" id="ogImage" content="' . htmlspecialchars($profile['ogImage']) . '">', $html);
        $html = preg_replace('/<meta property="og:image:width" id="ogImageWidth" content=".*?">/', '<meta property="og:image:width" id="ogImageWidth" content="' . htmlspecialchars($profile['ogImageWidth']) . '">', $html);
        $html = preg_replace('/<meta property="og:image:height" id="ogImageHeight" content=".*?">/', '<meta property="og:image:height" id="ogImageHeight" content="' . htmlspecialchars($profile['ogImageHeight']) . '">', $html);
        $html = preg_replace('/<meta property="og:image:alt" id="ogImageAlt" content=".*?">/', '<meta property="og:image:alt" id="ogImageAlt" content="' . htmlspecialchars($profile['ogImageAlt']) . '">', $html);
        $html = preg_replace('/<meta name="twitter:card" id="twitterCard" content=".*?">/', '<meta name="twitter:card" id="twitterCard" content="' . htmlspecialchars($profile['twitterCardType']) . '">', $html);
        $html = preg_replace('/<meta name="twitter:title" id="twitterTitle" content=".*?">/', '<meta name="twitter:title" id="twitterTitle" content="' . htmlspecialchars($profile['twitterTitle']) . '">', $html);
        $html = preg_replace('/<meta name="twitter:description" id="twitterDescription" content=".*?">/', '<meta name="twitter:description" id="twitterDescription" content="' . htmlspecialchars($profile['twitterDescription']) . '">', $html);
        $html = preg_replace('/<meta name="twitter:image" id="twitterImage" content=".*?">/', '<meta name="twitter:image" id="twitterImage" content="' . htmlspecialchars($profile['twitterImage']) . '">', $html);

        file_put_contents($indexFile, $html);
    }

    // Jika request AJAX
    if (!empty($_SERVER['HTTP_X_REQUESTED_WITH']) && strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) == 'xmlhttprequest') {
        header('Content-Type: application/json');
        echo json_encode(['ok' => true, 'profile' => $profile]);
        exit;
    }

    $message = 'Configuration saved & synced!';
    $messageType = 'success';
}
?>
<!DOCTYPE html>
<html lang="id">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>HELIX WEB PROFILE - Admin</title>
    <link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg-dark: #050911;
            --panel-bg: rgba(10, 16, 30, 0.92);
            --accent-green: #00ffb3;
            --accent-glow: rgba(0, 255, 179, 0.4);
            --accent-pink: #ff2a6d;
            --text-light: #f8fafc;
            --text-muted: #8492a6;
            --border-cyber: rgba(0, 255, 179, 0.3);
            --border-dark: #1e293b;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
            font-family: 'Inter', sans-serif;
            background-color: var(--bg-dark);
            background-image: 
                linear-gradient(rgba(0, 255, 179, 0.03) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0, 255, 179, 0.03) 1px, transparent 1px);
            background-size: 30px 30px;
            color: var(--text-light);
            min-height: 100vh;
            padding: 24px;
        }

        .helix-control-container {
            max-width: 960px;
            margin: 0 auto;
        }

        .control-header-top {
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            margin-bottom: 20px;
        }

        .control-header-title {
            font-family: 'Share Tech Mono', monospace;
            font-size: 28px;
            font-weight: 700;
            color: var(--accent-green);
            letter-spacing: 2px;
            margin-bottom: 14px;
            text-shadow: 0 0 12px var(--accent-glow);
        }

        .btn-back-dashboard {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-family: 'Share Tech Mono', monospace;
            background: var(--accent-green);
            color: #000000;
            border: none;
            padding: 10px 22px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 800;
            cursor: pointer;
            text-decoration: none;
            letter-spacing: 0.5px;
            box-shadow: 0 0 15px var(--accent-glow);
            transition: all 0.2s ease;
        }

        .btn-back-dashboard:hover {
            background: #00e6a0;
            transform: translateY(-2px);
            box-shadow: 0 0 25px var(--accent-glow);
        }

        .control-card {
            background: rgba(8, 16, 30, 0.95);
            border: 1px solid var(--accent-green);
            border-radius: 20px;
            padding: 36px 40px;
            box-shadow: 0 0 35px rgba(0, 255, 179, 0.15);
        }

        .cyber-section-title {
            font-family: 'Share Tech Mono', monospace;
            font-size: 15px;
            font-weight: 700;
            color: var(--accent-green);
            letter-spacing: 1px;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cyber-divider {
            border: none;
            height: 1px;
            background: rgba(0, 255, 179, 0.25);
            margin-bottom: 22px;
            box-shadow: 0 0 8px rgba(0, 255, 179, 0.2);
        }

        .cyber-form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }

        .cyber-form-group {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .cyber-label {
            font-family: 'Share Tech Mono', monospace;
            font-size: 14px;
            color: var(--accent-green);
            letter-spacing: 0.5px;
            font-weight: 600;
        }

        .cyber-input {
            background: #000000 !important;
            border: 1px solid rgba(0, 255, 179, 0.4) !important;
            border-radius: 12px !important;
            color: var(--accent-green) !important;
            padding: 14px 18px !important;
            font-family: 'Share Tech Mono', monospace !important;
            font-size: 15px !important;
            transition: all 0.2s ease;
            width: 100%;
        }

        .cyber-input:focus {
            outline: none !important;
            border-color: var(--accent-green) !important;
            box-shadow: 0 0 15px var(--accent-glow) !important;
        }

        .cyber-textarea {
            resize: vertical;
            min-height: 80px;
            line-height: 1.5;
        }

        .cyber-select {
            appearance: none;
            -webkit-appearance: none;
            background: #000000 url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2300ffb3' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E") no-repeat calc(100% - 18px) center !important;
            cursor: pointer;
        }

        .cyber-file-wrapper {
            display: flex;
            align-items: center;
            gap: 14px;
            background: #000000;
            border: 1px solid rgba(0, 255, 179, 0.4);
            border-radius: 12px;
            padding: 8px 12px;
            width: 100%;
        }

        .cyber-file-btn {
            background: var(--accent-green);
            color: #000000;
            font-family: 'Share Tech Mono', monospace;
            font-size: 13px;
            font-weight: 800;
            padding: 8px 18px;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            white-space: nowrap;
            display: inline-block;
        }

        .cyber-file-btn:hover {
            background: #00e6a0;
            box-shadow: 0 0 15px var(--accent-glow);
        }

        .cyber-file-name {
            font-family: 'Share Tech Mono', monospace;
            font-size: 13px;
            color: var(--accent-green);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        .cyber-file-meta {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-top: 6px;
            font-family: 'Share Tech Mono', monospace;
            font-size: 11px;
            padding: 0 4px;
        }

        .cyber-file-current {
            color: var(--text-muted);
            word-break: break-all;
        }

        .cyber-hapus-label {
            color: var(--accent-pink);
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            font-weight: 600;
            white-space: nowrap;
        }

        .cyber-hapus-cb {
            accent-color: var(--accent-pink);
            cursor: pointer;
            width: 14px;
            height: 14px;
        }

        .cyber-color-bar-container {
            display: flex;
            align-items: center;
            gap: 12px;
            background: #000000;
            border: 1px solid rgba(0, 255, 179, 0.4);
            border-radius: 12px;
            padding: 8px 14px;
            width: 100%;
        }

        .cyber-color-bar {
            flex: 1;
            height: 32px;
            border-radius: 6px;
            border: 1px solid rgba(255, 255, 255, 0.3);
            cursor: pointer;
            box-shadow: 0 0 12px rgba(0, 255, 179, 0.3);
        }

        .btn-save-config {
            width: 100%;
            margin-top: 36px;
            font-family: 'Share Tech Mono', monospace;
            background: var(--accent-green);
            color: #000000;
            border: none;
            padding: 18px 24px;
            border-radius: 14px;
            font-size: 16px;
            font-weight: 800;
            letter-spacing: 1.5px;
            cursor: pointer;
            box-shadow: 0 0 20px var(--accent-glow);
            transition: all 0.2s ease;
        }

        .btn-save-config:hover {
            background: #00e6a0;
            transform: translateY(-2px);
            box-shadow: 0 0 30px var(--accent-glow);
        }

        .alert-box {
            background: rgba(0, 255, 179, 0.15);
            border: 1px solid var(--accent-green);
            border-radius: 10px;
            color: var(--accent-green);
            padding: 14px 20px;
            font-family: 'Share Tech Mono', monospace;
            margin-bottom: 20px;
            box-shadow: 0 0 15px var(--accent-glow);
        }

        @media (max-width: 768px) {
            body { padding: 12px 8px; }
            .control-card { padding: 20px 16px; border-radius: 14px; }
            .cyber-form-grid { grid-template-columns: 1fr; gap: 16px; }
            .control-header-title { font-size: 22px; }
        }
    </style>
</head>
<body>
    <div class="helix-control-container">
        <div class="control-header-top">
            <h1 class="control-header-title">HELIX WEB PROFILE</h1>
            <a href="admin.html" class="btn-back-dashboard">
                &lt; BACK DASHBOARD
            </a>
        </div>

        <?php if (!empty($message)): ?>
            <div class="alert-box">
                <?= htmlspecialchars($message) ?>
            </div>
        <?php endif; ?>

        <div class="control-card">
            <form action="editweb.php" method="POST" enctype="multipart/form-data">
                
                <!-- SECTION 1: BASIC META -->
                <div class="cyber-section-title">■ BASIC META</div>
                <hr class="cyber-divider">

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="cyber-form-group">
                        <label class="cyber-label">SITE TITLE</label>
                        <input type="text" name="siteTitle" class="cyber-input" value="<?= htmlspecialchars($profile['siteTitle']) ?>" placeholder="HONGLEONG">
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">META DESCRIPTION</label>
                        <textarea name="metaDescription" class="cyber-input cyber-textarea" rows="3" placeholder="HONGLEONG"><?= htmlspecialchars($profile['metaDescription']) ?></textarea>
                    </div>

                    <div class="cyber-form-grid">
                        <div class="cyber-form-group">
                            <label class="cyber-label">FAVICON</label>
                            <div class="cyber-file-wrapper">
                                <label class="cyber-file-btn">Choose File <input type="file" name="favicon" accept="image/*" style="display:none;" onchange="this.parentElement.nextElementSibling.textContent = this.files[0] ? this.files[0].name : 'No file chosen'"></label>
                                <span class="cyber-file-name">No file chosen</span>
                            </div>
                            <div class="cyber-file-meta">
                                <span class="cyber-file-current">CURRENT: <?= htmlspecialchars($profile['favicon']) ?></span>
                                <label class="cyber-hapus-label"><input type="checkbox" name="del_favicon" value="1" class="cyber-hapus-cb"> hapus</label>
                            </div>
                        </div>

                        <div class="cyber-form-group">
                            <label class="cyber-label">APPLE TOUCH ICON</label>
                            <div class="cyber-file-wrapper">
                                <label class="cyber-file-btn">Choose File <input type="file" name="appleTouchIcon" accept="image/*" style="display:none;" onchange="this.parentElement.nextElementSibling.textContent = this.files[0] ? this.files[0].name : 'No file chosen'"></label>
                                <span class="cyber-file-name">No file chosen</span>
                            </div>
                            <div class="cyber-file-meta">
                                <span class="cyber-file-current">CURRENT: <?= htmlspecialchars($profile['appleTouchIcon']) ?></span>
                                <label class="cyber-hapus-label"><input type="checkbox" name="del_appleTouchIcon" value="1" class="cyber-hapus-cb"> hapus</label>
                            </div>
                        </div>
                    </div>

                    <div class="cyber-form-grid">
                        <div class="cyber-form-group">
                            <label class="cyber-label">THEME COLOR</label>
                            <div class="cyber-color-bar-container" onclick="document.getElementById('themeColorInput').click()">
                                <div class="cyber-color-bar" id="themeColorBar" style="background: <?= htmlspecialchars($profile['themeColor']) ?>;"></div>
                                <input type="color" id="themeColorInput" name="themeColor" value="<?= htmlspecialchars($profile['themeColor']) ?>" style="position:absolute; opacity:0; width:1px; height:1px;" onchange="document.getElementById('themeColorBar').style.background = this.value">
                            </div>
                        </div>

                        <div class="cyber-form-group">
                            <label class="cyber-label">APPLE WEBAPP CAPABLE</label>
                            <select name="appleWebAppCapable" class="cyber-input cyber-select">
                                <option value="yes" <?= $profile['appleWebAppCapable'] === 'yes' ? 'selected' : '' ?>>yes</option>
                                <option value="no" <?= $profile['appleWebAppCapable'] === 'no' ? 'selected' : '' ?>>no</option>
                            </select>
                        </div>
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">APPLE WEBAPP STATUSBAR STYLE</label>
                        <select name="appleWebAppStatusbarStyle" class="cyber-input cyber-select">
                            <option value="default" <?= $profile['appleWebAppStatusbarStyle'] === 'default' ? 'selected' : '' ?>>default</option>
                            <option value="black" <?= $profile['appleWebAppStatusbarStyle'] === 'black' ? 'selected' : '' ?>>black</option>
                            <option value="black-translucent" <?= $profile['appleWebAppStatusbarStyle'] === 'black-translucent' ? 'selected' : '' ?>>black-translucent</option>
                        </select>
                    </div>
                </div>

                <!-- SECTION 2: OPEN GRAPH (SOCIAL SHARE) -->
                <div class="cyber-section-title" style="margin-top: 40px;">■ OPEN GRAPH (SOCIAL SHARE)</div>
                <hr class="cyber-divider">

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="cyber-form-grid">
                        <div class="cyber-form-group">
                            <label class="cyber-label">OG TYPE</label>
                            <select name="ogType" class="cyber-input cyber-select">
                                <option value="website" <?= $profile['ogType'] === 'website' ? 'selected' : '' ?>>website</option>
                                <option value="article" <?= $profile['ogType'] === 'article' ? 'selected' : '' ?>>article</option>
                                <option value="profile" <?= $profile['ogType'] === 'profile' ? 'selected' : '' ?>>profile</option>
                                <option value="book" <?= $profile['ogType'] === 'book' ? 'selected' : '' ?>>book</option>
                            </select>
                        </div>
                        <div class="cyber-form-group">
                            <label class="cyber-label">OG LOCALE</label>
                            <input type="text" name="ogLocale" class="cyber-input" value="<?= htmlspecialchars($profile['ogLocale']) ?>" placeholder="en_MY">
                        </div>
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">OG TITLE</label>
                        <input type="text" name="ogTitle" class="cyber-input" value="<?= htmlspecialchars($profile['ogTitle']) ?>" placeholder="HONGLEONG">
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">OG DESCRIPTION</label>
                        <textarea name="ogDescription" class="cyber-input cyber-textarea" rows="3" placeholder="HONGLEONG"><?= htmlspecialchars($profile['ogDescription']) ?></textarea>
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">OG URL</label>
                        <input type="text" name="ogUrl" class="cyber-input" value="<?= htmlspecialchars($profile['ogUrl']) ?>" placeholder="https://...">
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">OG IMAGE</label>
                        <div class="cyber-file-wrapper">
                            <label class="cyber-file-btn">Choose File <input type="file" name="ogImage" accept="image/*" style="display:none;" onchange="this.parentElement.nextElementSibling.textContent = this.files[0] ? this.files[0].name : 'No file chosen'"></label>
                            <span class="cyber-file-name">No file chosen</span>
                        </div>
                        <div class="cyber-file-meta">
                            <span class="cyber-file-current">CURRENT: <?= htmlspecialchars($profile['ogImage']) ?></span>
                            <label class="cyber-hapus-label"><input type="checkbox" name="del_ogImage" value="1" class="cyber-hapus-cb"> hapus</label>
                        </div>
                    </div>

                    <div class="cyber-form-grid">
                        <div class="cyber-form-group">
                            <label class="cyber-label">OG IMAGE WIDTH</label>
                            <input type="number" name="ogImageWidth" class="cyber-input" value="<?= htmlspecialchars($profile['ogImageWidth']) ?>" placeholder="1200">
                        </div>
                        <div class="cyber-form-group">
                            <label class="cyber-label">OG IMAGE HEIGHT</label>
                            <input type="number" name="ogImageHeight" class="cyber-input" value="<?= htmlspecialchars($profile['ogImageHeight']) ?>" placeholder="630">
                        </div>
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">OG IMAGE ALT</label>
                        <input type="text" name="ogImageAlt" class="cyber-input" value="<?= htmlspecialchars($profile['ogImageAlt']) ?>" placeholder="JAPANESE BANK">
                    </div>
                </div>

                <!-- SECTION 3: TWITTER CARD -->
                <div class="cyber-section-title" style="margin-top: 40px;">■ TWITTER CARD</div>
                <hr class="cyber-divider">

                <div style="display: flex; flex-direction: column; gap: 20px;">
                    <div class="cyber-form-group">
                        <label class="cyber-label">TWITTER CARD TYPE</label>
                        <select name="twitterCardType" class="cyber-input cyber-select">
                            <option value="summary_large_image" <?= $profile['twitterCardType'] === 'summary_large_image' ? 'selected' : '' ?>>summary_large_image</option>
                            <option value="summary" <?= $profile['twitterCardType'] === 'summary' ? 'selected' : '' ?>>summary</option>
                            <option value="app" <?= $profile['twitterCardType'] === 'app' ? 'selected' : '' ?>>app</option>
                            <option value="player" <?= $profile['twitterCardType'] === 'player' ? 'selected' : '' ?>>player</option>
                        </select>
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">TWITTER TITLE</label>
                        <input type="text" name="twitterTitle" class="cyber-input" value="<?= htmlspecialchars($profile['twitterTitle']) ?>" placeholder="Hong Leong Bank">
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">TWITTER DESCRIPTION</label>
                        <textarea name="twitterDescription" class="cyber-input cyber-textarea" rows="3" placeholder="Resit Transaksi Hong Leong Bank"><?= htmlspecialchars($profile['twitterDescription']) ?></textarea>
                    </div>

                    <div class="cyber-form-group">
                        <label class="cyber-label">TWITTER IMAGE</label>
                        <div class="cyber-file-wrapper">
                            <label class="cyber-file-btn">Choose File <input type="file" name="twitterImage" accept="image/*" style="display:none;" onchange="this.parentElement.nextElementSibling.textContent = this.files[0] ? this.files[0].name : 'No file chosen'"></label>
                            <span class="cyber-file-name">No file chosen</span>
                        </div>
                        <div class="cyber-file-meta">
                            <span class="cyber-file-current">CURRENT: <?= htmlspecialchars($profile['twitterImage']) ?></span>
                            <label class="cyber-hapus-label"><input type="checkbox" name="del_twitterImage" value="1" class="cyber-hapus-cb"> hapus</label>
                        </div>
                    </div>
                </div>

                <button type="submit" class="btn-save-config">SAVE WEB PROFILE</button>
            </form>
        </div>
    </div>
</body>
</html>
