const API_URL = '/api';

// --- GEOSOCIAL AURA CYBERPUNK EXTENSIONS ---
const MUNICIPALITY_DISTANCES = {
    "iribarren": { "iribarren": 0, "palavecino": 12, "crespo": 38, "urdaneta": 78, "torres": 98, "jiménez": 35, "morán": 65, "andrés eloy blanco": 82, "simón planas": 45 },
    "palavecino": { "iribarren": 12, "palavecino": 0, "crespo": 45, "urdaneta": 88, "torres": 110, "jiménez": 47, "morán": 77, "andrés eloy blanco": 90, "simón planas": 35 },
    "crespo": { "iribarren": 38, "palavecino": 45, "crespo": 0, "urdaneta": 72, "torres": 135, "jiménez": 73, "morán": 103, "andrés eloy blanco": 118, "simón planas": 78 },
    "urdaneta": { "iribarren": 78, "palavecino": 88, "crespo": 72, "urdaneta": 0, "torres": 105, "jiménez": 108, "morán": 138, "andrés eloy blanco": 150, "simón planas": 120 },
    "torres": { "iribarren": 98, "palavecino": 110, "crespo": 135, "urdaneta": 105, "torres": 0, "jiménez": 63, "morán": 90, "andrés eloy blanco": 115, "simón planas": 140 },
    "jiménez": { "iribarren": 35, "palavecino": 47, "crespo": 73, "urdaneta": 108, "torres": 63, "jiménez": 0, "morán": 30, "andrés eloy blanco": 48, "simón planas": 80 },
    "morán": { "iribarren": 65, "palavecino": 77, "crespo": 103, "urdaneta": 138, "torres": 90, "jiménez": 30, "morán": 0, "andrés eloy blanco": 25, "simón planas": 98 },
    "andrés eloy blanco": { "iribarren": 82, "palavecino": 90, "crespo": 118, "urdaneta": 150, "torres": 115, "jiménez": 48, "morán": 25, "andrés eloy blanco": 0, "simón planas": 95 },
    "simón planas": { "iribarren": 45, "palavecino": 35, "crespo": 78, "urdaneta": 120, "torres": 140, "jiménez": 80, "morán": 98, "andrés eloy blanco": 95, "simón planas": 0 }
};

const MUNICIPALITY_METADATA = {
    "Torres": { coords: "10.1583° N, 70.0833° W", bandwidth: "142.5 MHz" },
    "Urdaneta": { coords: "10.5833° N, 69.5833° W", bandwidth: "98.2 MHz" },
    "Crespo": { coords: "10.2833° N, 69.1667° W", bandwidth: "115.6 MHz" },
    "Iribarren": { coords: "10.0667° N, 69.3167° W", bandwidth: "256.4 MHz" },
    "Palavecino": { coords: "10.0632° N, 69.2528° W", bandwidth: "188.1 MHz" },
    "Jiménez": { coords: "9.9167° N, 69.5667° W", bandwidth: "88.7 MHz" },
    "Morán": { coords: "9.7833° N, 69.8000° W", bandwidth: "120.3 MHz" },
    "Andrés Eloy Blanco": { coords: "9.7167° N, 69.5333° W", bandwidth: "72.4 MHz" },
    "Simón Planas": { coords: "9.7833° N, 69.0167° W", bandwidth: "94.8 MHz" }
};

let realUserCoords = null;
let gpsWatchId = null;
let gpsAccuracyMeters = null; // Track GPS accuracy in meters

function parseCoords(coordStr) {

    if (!coordStr) return null;
    const parts = coordStr.split(',');
    if (parts.length !== 2) return null;
    
    function parsePart(part) {
        const clean = part.replace('°', '').trim();
        const match = clean.match(/^([0-9.-]+)\s*([NSEW])$/i);
        if (!match) return parseFloat(clean);
        
        let val = parseFloat(match[1]);
        const dir = match[2].toUpperCase();
        if (dir === 'S' || dir === 'W') {
            val = -val;
        }
        return val;
    }
    
    return {
        lat: parsePart(parts[0]),
        lon: parsePart(parts[1])
    };
}

function getHaversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
}

function getBearing(lat1, lon1, lat2, lon2) {
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const lat1Rad = lat1 * Math.PI / 180;
    const lat2Rad = lat2 * Math.PI / 180;
    const y = Math.sin(dLon) * Math.cos(lat2Rad);
    const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    return Math.atan2(y, x);
}

function findClosestMunicipality(lat, lon) {
    let closestName = null;
    let minDistance = Infinity;
    for (const [mName, data] of Object.entries(MUNICIPALITY_METADATA)) {
        const coords = parseCoords(data.coords);
        if (coords) {
            const dist = getHaversineDistance(lat, lon, coords.lat, coords.lon);
            if (dist < minDistance) {
                minDistance = dist;
                closestName = mName;
            }
        }
    }
    return closestName;
}

function updateLocationToggleUI(enabled, accuracy) {
    const btn = document.getElementById('btn-toggle-location');
    const txt = document.getElementById('btn-toggle-location-text');
    if (!btn || !txt) return;
    if (enabled) {
        let accLabel = '';
        if (accuracy !== undefined && accuracy !== null) {
            if (accuracy < 50) accLabel = ' [GPS PRECISO]';
            else if (accuracy < 500) accLabel = ' [GPS OK]';
            else if (accuracy < 2000) accLabel = ' [GPS APROX]';
            else accLabel = ' [IP APROX]';
        }
        btn.className = "mb-6 w-full py-1.5 bg-primary/20 text-primary border border-primary/40 text-[10px] font-status-code rounded hover:bg-primary/30 transition-all flex items-center justify-center gap-1.5";
        txt.textContent = `DESACTIVAR UBICACIÓN${accLabel}`;
    } else {
        btn.className = "mb-6 w-full py-1.5 bg-error/20 text-error border border-error/40 text-[10px] font-status-code rounded hover:bg-error/30 transition-all flex items-center justify-center gap-1.5";
        txt.textContent = "ACTIVAR UBICACIÓN";
    }
}

function requestUserGeolocation() {
    const currentUser = getCurrentUser();
    if (!currentUser) return;

    // Check if tracking is disabled
    const trackingEnabled = localStorage.getItem('locationTrackingEnabled') !== 'false';
    updateLocationToggleUI(trackingEnabled, gpsAccuracyMeters);
    if (!trackingEnabled) {
        return;
    }

    let lastUploadTime = 0;

    async function processCoords(lat, lon, accuracy) {
        realUserCoords = { lat, lon };
        gpsAccuracyMeters = accuracy;
        console.log(`Telemetry Coordinates locked: lat=${lat}, lon=${lon}, accuracy=${accuracy}m`);
        updateLocationToggleUI(true, accuracy);
        
        // Throttle uploads to backend: max every 4 seconds
        const now = Date.now();
        if (now - lastUploadTime < 4000) return;
        lastUploadTime = now;

        // Upload coordinates to backend
        try {
            await fetch(`${API_URL}/users/${currentUser.id}/coordinates`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    latitude: realUserCoords.lat,
                    longitude: realUserCoords.lon
                })
            });
        } catch (err) {
            console.error("Error uploading coordinates:", err);
        }

        // Only auto-detect municipality when GPS accuracy is good (<1000m)
        // This prevents IP-based locations from causing inconsistent municipality detection
        if (accuracy !== null && accuracy < 1000) {
            const closest = findClosestMunicipality(lat, lon);
            const override = localStorage.getItem('locationOverride') === 'true';
            if (closest && closest !== currentUser.location && (!override || currentUser.location === "Anónimo")) {
                console.log(`Auto-matching municipality by GPS (accuracy: ${accuracy}m): ${closest} (previously: ${currentUser.location})`);
                try {
                    const res = await fetch(`${API_URL}/users/${currentUser.id}/update_location`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ location: closest })
                    });
                    if (res.ok) {
                        currentUser.location = closest;
                        sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
                        updateUserUI();
                        if (typeof updateMapVisuals === 'function') updateMapVisuals();
                    }
                } catch (err) {
                    console.error("Error auto-updating location:", err);
                }
            }
        } else {
            console.log(`Skipping municipality auto-detect: accuracy too low (${accuracy}m). Keeping: ${currentUser.location}`);
        }

        if (typeof loadFeed === 'function') loadFeed();
        if (typeof updateRadar === 'function') updateRadar();
    }

    async function runIPFallback() {
        console.warn("Initiating IP fallback lookup...");
        try {
            const ipRes = await fetch('https://ipapi.co/json/');
            const ipData = await ipRes.json();
            if (ipData && ipData.latitude !== undefined && ipData.longitude !== undefined) {
                // Mark accuracy as very high (inaccurate) for IP-based — 50000m = 50km
                processCoords(ipData.latitude, ipData.longitude, 50000);
            } else {
                throw new Error("Invalid IP geo payload");
            }
        } catch (ipErr) {
            console.warn("IP geolocation fallback failed. Utilizing municipality default.", ipErr);
            const loc = (currentUser.location && currentUser.location !== "Anónimo") ? currentUser.location : "Iribarren";
            const meta = MUNICIPALITY_METADATA[loc];
            const coords = parseCoords(meta?.coords);
            if (coords) {
                const offsetLat = ((currentUser.id * 17) % 100 - 50) * 0.00001;
                const offsetLon = ((currentUser.id * 23) % 100 - 50) * 0.00001;
                processCoords(coords.lat + offsetLat, coords.lon + offsetLon, 100000);
            }
        }
    }

    // Stop any existing watcher
    if (gpsWatchId !== null) {
        navigator.geolocation.clearWatch(gpsWatchId);
        gpsWatchId = null;
    }

    if (navigator.geolocation) {
        // Use watchPosition for continuous, improving accuracy (much better than repeated getCurrentPosition)
        gpsWatchId = navigator.geolocation.watchPosition(
            (position) => {
                processCoords(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.coords.accuracy // accuracy in meters
                );
            },
            async (error) => {
                console.warn("GPS watchPosition failed.", error);
                await runIPFallback();
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
        );
    } else {
        console.warn("Geolocation API not supported or disabled in this browser.");
        runIPFallback();
    }
}



function getMunicipalityDistance(m1, m2) {
    if (!m1 || !m2) return 0;
    const name1 = m1.toLowerCase().trim();
    const name2 = m2.toLowerCase().trim();
    if (MUNICIPALITY_DISTANCES[name1] && MUNICIPALITY_DISTANCES[name1][name2] !== undefined) {
        return MUNICIPALITY_DISTANCES[name1][name2];
    }
    return name1 === name2 ? 0 : 50;
}

function decryptText(element, finalProductText, duration = 800) {
    if (!element) return;
    const chars = "010101ABCDEF#%&*@<>/[]{}";
    const finalLength = finalProductText.length;
    let frame = 0;
    const totalFrames = 15;
    const intervalTime = duration / totalFrames;
    
    const originalText = finalProductText;
    
    const decryptInterval = setInterval(() => {
        let currentText = "";
        const progress = frame / totalFrames;
        const revealIndex = Math.floor(progress * finalLength);
        
        for (let i = 0; i < finalLength; i++) {
            if (i < revealIndex) {
                currentText += originalText[i];
            } else if (originalText[i] === " ") {
                currentText += " ";
            } else {
                currentText += chars[Math.floor(Math.random() * chars.length)];
            }
        }
        
        element.textContent = currentText;
        frame++;
        
        if (frame > totalFrames) {
            clearInterval(decryptInterval);
            element.textContent = originalText;
        }
    }, intervalTime);
}

const animatedMessageIds = new Set();
let lastOpenedPostId = null;
let emergencySirenInterval = null;

function triggerGlitchEffect() {
    let overlay = document.getElementById('glitch-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = 'glitch-overlay';
        document.body.appendChild(overlay);
    }
    
    if (window.soundEffects) {
        window.soundEffects.playGlitchSound();
    }
    
    overlay.classList.remove('glitch-active');
    void overlay.offsetWidth;
    overlay.classList.add('glitch-active');
    
    setTimeout(() => {
        overlay.classList.remove('glitch-active');
    }, 300);
}

function triggerEmergencySiren(text) {
    const overlay = document.getElementById('emergency-siren-overlay');
    const sirenText = document.getElementById('emergency-siren-text');
    
    if (overlay) {
        if (sirenText && text) {
            sirenText.textContent = text;
        }
        overlay.style.display = 'flex';
        overlay.classList.remove('hidden');
    }
    
    if (!emergencySirenInterval) {
        if (window.soundEffects) window.soundEffects.playEmergencySiren();
        emergencySirenInterval = setInterval(() => {
            if (window.soundEffects) window.soundEffects.playEmergencySiren();
        }, 1500);
    }
}

function stopEmergencySiren() {
    const overlay = document.getElementById('emergency-siren-overlay');
    if (overlay) {
        overlay.style.display = 'none';
        overlay.classList.add('hidden');
    }
    if (emergencySirenInterval) {
        clearInterval(emergencySirenInterval);
        emergencySirenInterval = null;
    }
}

function startBurnNoteTicker() {
    if (window.burnNoteTickerInterval) clearInterval(window.burnNoteTickerInterval);
    window.burnNoteTickerInterval = setInterval(() => {
        const bubbles = document.querySelectorAll('[data-opened-at]');
        bubbles.forEach(bubble => {
            const burnTime = parseInt(bubble.dataset.burnTime);
            const openedAtStr = bubble.dataset.openedAt;
            if (!openedAtStr) return; // Not opened yet
            
            const openedTime = new Date(openedAtStr.replace(' ', 'T') + 'Z').getTime();
            const elapsed = Math.floor((Date.now() - openedTime) / 1000);
            
            const totalBurnTime = burnTime === -1 ? 15 : burnTime;
            const timeLeft = totalBurnTime - elapsed;
            
            const timerEl = bubble.querySelector('.burn-timer-val');
            const textEl = bubble.querySelector('.chat-message-text');
            
            if (timeLeft <= 0) {
                if (!bubble.classList.contains('burning')) {
                    bubble.classList.add('burning');
                    if (window.soundEffects) window.soundEffects.playGlitchSound();
                    
                    if (textEl) {
                        textEl.textContent = "██████████████";
                        textEl.classList.add('text-error', 'animate-pulse');
                    }
                    if (timerEl) {
                        timerEl.parentNode.innerHTML = "🔥 SEÑAL PURGADA";
                    }
                    
                    setTimeout(() => {
                        bubble.style.transition = 'all 0.5s ease-out';
                        bubble.style.opacity = '0';
                        bubble.style.height = '0';
                        bubble.style.padding = '0';
                        bubble.style.margin = '0';
                        setTimeout(() => bubble.remove(), 500);
                    }, 1000);
                }
            } else {
                if (timerEl) {
                    timerEl.textContent = timeLeft;
                }
            }
        });
    }, 1000);
}

function startRadarSonarSweep() {
    const pulseRing = document.getElementById('radar-pulse-ring');
    if (pulseRing) {
        pulseRing.classList.remove('hidden');
    }
    
    setInterval(() => {
        
        // Glow avatars / list items
        const nodes = document.querySelectorAll('#radar-users li, .btn-radar-node');
        nodes.forEach(node => {
            node.style.transition = 'all 0.3s ease-out';
            node.style.borderColor = 'rgba(0, 242, 255, 0.8)';
            node.style.boxShadow = '0 0 10px rgba(0, 242, 255, 0.4)';
            
            setTimeout(() => {
                node.style.borderColor = 'transparent';
                node.style.boxShadow = 'none';
            }, 800);
        });

        // Glow absolute positioning dots in radar (both custom blips and the center dot)
        const dotElements = document.querySelectorAll('#radar-blips-container > div, .radar-sweep ~ div:not(#radar-pulse-ring):not(#radar-blips-container)');
        dotElements.forEach(dot => {
            const isBlip = dot.parentElement && dot.parentElement.id === 'radar-blips-container';
            const baseTransform = isBlip ? 'translate(-50%, -50%)' : '';
            
            dot.style.transition = 'transform 0.3s ease';
            dot.style.transform = `${baseTransform} scale(2.5)`.trim();
            setTimeout(() => {
                dot.style.transform = `${baseTransform} scale(1)`.trim();
            }, 800);
        });
    }, 3000);
}

// --- AUTHENTICATION ---
function getCurrentUser() {
    const userStr = sessionStorage.getItem('currentUser');
    return userStr ? JSON.parse(userStr) : null;
}

function requireAuth() {
    const user = getCurrentUser();
    const isLoginPage = window.location.pathname.endsWith('/login') || window.location.pathname === '/login' || window.location.pathname.endsWith('login');
    
    // Si no hay usuario y no estamos en la página de login, redirigir a login
    if (!user && !isLoginPage) {
        window.location.href = '/login';
    }
}

if (getCurrentUser() && (window.location.pathname.endsWith('/login') || window.location.pathname === '/login' || window.location.pathname.endsWith('login'))) {
    window.location.href = '/';
}

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
    let user = getCurrentUser();
    if (user) {
        requestUserGeolocation();
    }

    // --- AUDIO SPECTRUM VISUALIZER ---
    const canvasVis = document.getElementById('audio-visualizer');
    if (canvasVis && window.soundEffects) {
        window.soundEffects.setCanvas(canvasVis);
    }

    // --- GHOST MODE ---
    const btnGhost = document.getElementById('btn-ghost');
    const ghostIndicator = document.getElementById('ghost-indicator');
    
    function updateGhostUI() {
        if (!user) return;
        if (user.is_ghost) {
            if (ghostIndicator) ghostIndicator.classList.remove('hidden');
            if (btnGhost) btnGhost.classList.add('text-error');
        } else {
            if (ghostIndicator) ghostIndicator.classList.add('hidden');
            if (btnGhost) btnGhost.classList.remove('text-error');
        }
    }
    
    if (btnGhost && user) {
        updateGhostUI();
        btnGhost.addEventListener('click', async () => {
            const nextGhostState = !user.is_ghost;
            try {
                const res = await fetch(`${API_URL}/users/${user.id}/ghost`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ is_ghost: nextGhostState })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    user.is_ghost = nextGhostState;
                    sessionStorage.setItem('currentUser', JSON.stringify(user));
                    updateGhostUI();
                    if (window.soundEffects) {
                        window.soundEffects.playGlitchSound();
                    }
                    loadFeed();
                    loadStories();
                    updateUserUI();
                }
            } catch (err) {
                console.error("Error toggling Ghost Mode:", err);
            }
        });
    }

    // --- POLL BUILDER PANEL TOGGLE ---
    const btnTogglePollBuilder = document.getElementById('btn-toggle-poll-builder');
    const pollBuilderPanel = document.getElementById('poll-builder-panel');
    if (btnTogglePollBuilder && pollBuilderPanel) {
        btnTogglePollBuilder.addEventListener('click', () => {
            pollBuilderPanel.classList.toggle('hidden');
            if (window.soundEffects) window.soundEffects.playClick();
        });
    }

    // --- DISMISS EMERGENCY BROADCAST ---
    const btnDismissEmergency = document.getElementById('btn-dismiss-emergency');
    if (btnDismissEmergency) {
        btnDismissEmergency.addEventListener('click', async () => {
            stopEmergencySiren();
            if (user) {
                await fetch(`${API_URL}/notifications/read/${user.id}`, { method: 'POST' });
                if (window.fetchNotifications) {
                    window.fetchNotifications();
                }
            }
        });
    }

    // --- CYBERPUNK CHRONO TICKERS ---
    if (user) {
        startBurnNoteTicker();
    }
    startRadarSonarSweep();

    // --- AUDIO VOLUME CONTROLLER ---
    const btnVolume = document.getElementById('btn-volume');
    if (btnVolume && window.soundEffects) {
        if (window.soundEffects.isMuted()) {
            btnVolume.classList.add('mute-active');
        }
        btnVolume.addEventListener('click', () => {
            const isMuted = window.soundEffects.toggleMuted();
            if (isMuted) {
                btnVolume.classList.add('mute-active');
            } else {
                btnVolume.classList.remove('mute-active');
                window.soundEffects.playClick();
            }
        });
    }

    // Global Click Listener for Cyberpunk HUD feedback
    document.addEventListener('click', (e) => {
        const target = e.target.closest('button, a, [role="button"], polygon, .btn-story-node, .btn-radar-node');
        if (target) {
            if (target.id === 'btn-volume') return;
            if (window.soundEffects) {
                window.soundEffects.playClick();
            }
        }
    });

    // PING Telemetry HUD
    function startPingTelemetry() {
        const userUIContainer = document.querySelector('.current-user-name');
        if (!userUIContainer) return;
        
        const pingContainer = document.createElement('span');
        pingContainer.id = 'hud-ping-telemetry';
        pingContainer.className = 'font-status-code text-[10px] text-primary/80 ml-2 border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded hidden md:inline';
        pingContainer.textContent = 'PING: --';
        userUIContainer.parentNode.insertBefore(pingContainer, userUIContainer);
        
        setInterval(async () => {
            const startTime = Date.now();
            try {
                const res = await fetch(`${API_URL}/users?_t=${startTime}`);
                if (res.ok) {
                    const latency = Date.now() - startTime;
                    pingContainer.textContent = `PING: ${latency}ms`;
                    if (latency > 150) {
                        pingContainer.className = 'font-status-code text-[10px] text-error border border-error/20 bg-error/5 px-1.5 py-0.5 rounded hidden md:inline';
                    } else {
                        pingContainer.className = 'font-status-code text-[10px] text-primary/80 border border-primary/20 bg-primary/5 px-1.5 py-0.5 rounded hidden md:inline';
                    }
                }
            } catch (e) {
                pingContainer.textContent = 'SIGNAL LOSS';
                pingContainer.className = 'font-status-code text-[10px] text-error border border-error/20 bg-error/5 px-1.5 py-0.5 rounded hidden md:inline animate-pulse';
            }
        }, 3000);
    }
    if (user) {
        startPingTelemetry();
    }

    // --- LOGIN / REGISTER PAGE LOGIC ---
    const formLogin = document.getElementById('form-login');
    const formRegister = document.getElementById('form-register');
    const showRegister = document.getElementById('show-register');
    const showLogin = document.getElementById('show-login');

    if (formLogin) {
        showRegister.addEventListener('click', (e) => {
            e.preventDefault();
            formLogin.classList.add('hidden');
            formRegister.classList.remove('hidden');
        });

        showLogin.addEventListener('click', (e) => {
            e.preventDefault();
            formRegister.classList.add('hidden');
            formLogin.classList.remove('hidden');
        });

        formLogin.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            try {
                const res = await fetch(`${API_URL}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
                const data = await res.json();
                if (res.ok) {
                    sessionStorage.setItem('currentUser', JSON.stringify(data));
                    window.location.href = '/';
                } else {
                    alert(data.error);
                }
            } catch (err) {
                console.error(err);
            }
        });

        formRegister.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('reg-name').value;
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;
            const location = "Anónimo"; // Se autodetectará automáticamente vía GPS/IP al iniciar sesión
            try {
                const res = await fetch(`${API_URL}/register`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, name, location })
                });

                const data = await res.json();
                if (res.ok) {
                    sessionStorage.setItem('currentUser', JSON.stringify(data));
                    window.location.href = '/';
                } else {
                    alert(data.error);
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // --- SETUP CURRENT USER UI ---
    function updateUserUI() {
        if (!user) return;
        const avatars = document.querySelectorAll('.current-user-avatar');
        avatars.forEach(img => img.src = user.avatar);
        const nameTags = document.querySelectorAll('.current-user-name');
        let accTag = '';
        if (gpsAccuracyMeters !== null) {
            if (gpsAccuracyMeters < 50) accTag = ' · GPS ✓';
            else if (gpsAccuracyMeters < 500) accTag = ' · GPS ~';
            else if (gpsAccuracyMeters < 2000) accTag = ' · APROX';
            else accTag = ' · IP';
        }
        nameTags.forEach(el => el.textContent = `${user.name} (${user.location.toUpperCase()}${accTag})`);
    }

    updateUserUI();

    // --- LOGOUT ---
    const btnLogout = document.getElementById('btn-logout');
    if (btnLogout) {
        btnLogout.addEventListener('click', () => {
            sessionStorage.removeItem('currentUser');
            window.location.href = '/login';
        });
    }

    // --- GPS LOCATION TOGGLE ---
    const btnToggleLoc = document.getElementById('btn-toggle-location');
    if (btnToggleLoc) {
        // Set initial UI state
        const trackingEnabled = localStorage.getItem('locationTrackingEnabled') !== 'false';
        updateLocationToggleUI(trackingEnabled);
        
        btnToggleLoc.addEventListener('click', async () => {
            const enabled = localStorage.getItem('locationTrackingEnabled') !== 'false';
            if (enabled) {
                // Disable it
                localStorage.setItem('locationTrackingEnabled', 'false');
                updateLocationToggleUI(false);
                if (gpsWatchId !== null) {
                    navigator.geolocation.clearWatch(gpsWatchId);
                    gpsWatchId = null;
                }
                realUserCoords = null;
                gpsAccuracyMeters = null;
                // Clear coordinates on backend
                try {
                    await fetch(`${API_URL}/users/${user.id}/coordinates`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ latitude: null, longitude: null })
                    });
                } catch(e) {}
                if (typeof updateRadar === 'function') updateRadar();
            } else {
                // Enable it
                localStorage.setItem('locationTrackingEnabled', 'true');
                updateLocationToggleUI(true);
                // Clear location override so it matches new GPS/IP!
                localStorage.removeItem('locationOverride');
                requestUserGeolocation();
            }
        });
    }


    // --- SETTINGS MODAL ---
    const btnSettings = document.getElementById('btn-settings');
    const btnAvatarSettings = document.getElementById('btn-avatar-settings');
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && user) {
        const pills = document.querySelectorAll('.interest-pill');
        
        // Setup interests pills toggle
        pills.forEach(pill => {
            pill.addEventListener('click', () => {
                pill.classList.toggle('selected');
                if (pill.classList.contains('selected')) {
                    pill.classList.remove('bg-surface', 'border-outline-variant');
                    pill.classList.add('bg-primary/20', 'border-primary', 'text-primary', 'shadow-[0_0_8px_rgba(0,242,255,0.2)]');
                } else {
                    pill.classList.remove('bg-primary/20', 'border-primary', 'text-primary', 'shadow-[0_0_8px_rgba(0,242,255,0.2)]');
                    pill.classList.add('bg-surface', 'border-outline-variant');
                }
                const selected = Array.from(document.querySelectorAll('.interest-pill.selected')).map(p => p.dataset.interest);
                document.getElementById('settings-interests-input').value = selected.join(',');
            });
        });

        const triggers = [btnSettings, btnAvatarSettings].filter(Boolean);
        triggers.forEach(t => t.addEventListener('click', () => {
            document.getElementById('settings-name').value = user.name;
            document.getElementById('settings-location').value = user.location;
            document.getElementById('settings-avatar-preview').src = user.avatar;
            
            // Init interests from user object
            const interests = user.interests ? user.interests.split(',').map(i => i.trim().toLowerCase()) : [];
            pills.forEach(pill => {
                const interestName = pill.dataset.interest.toLowerCase();
                if (interests.includes(interestName)) {
                    pill.classList.add('selected');
                    pill.classList.remove('bg-surface', 'border-outline-variant');
                    pill.classList.add('bg-primary/20', 'border-primary', 'text-primary', 'shadow-[0_0_8px_rgba(0,242,255,0.2)]');
                } else {
                    pill.classList.remove('selected', 'bg-primary/20', 'border-primary', 'text-primary', 'shadow-[0_0_8px_rgba(0,242,255,0.2)]');
                    pill.classList.add('bg-surface', 'border-outline-variant');
                }
            });
            document.getElementById('settings-interests-input').value = user.interests || '';
            
            settingsModal.classList.remove('hidden');
        }));

        document.getElementById('close-settings-modal').addEventListener('click', () => {
            settingsModal.classList.add('hidden');
        });

        // Image preview
        document.getElementById('settings-avatar-input').addEventListener('change', (e) => {
            if (e.target.files[0]) {
                document.getElementById('settings-avatar-preview').src = URL.createObjectURL(e.target.files[0]);
            }
        });

        document.getElementById('form-settings').addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('settings-name').value;
            const location = document.getElementById('settings-location').value;
            const interests = document.getElementById('settings-interests-input').value;
            const file = document.getElementById('settings-avatar-input').files[0];
            
            const formData = new FormData();
            formData.append('name', name);
            formData.append('location', location);
            formData.append('interests', interests);
            if (file) formData.append('avatar', file);

            const res = await fetch(`${API_URL}/users/${user.id}/update`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                user.name = data.name;
                user.location = data.location;
                user.interests = data.interests;
                if (data.avatar) user.avatar = data.avatar;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
                localStorage.setItem('locationOverride', 'true');
                updateUserUI();
                settingsModal.classList.add('hidden');
                loadFeed();
                updateMapVisuals();
            }
        });
    }

    // --- NOTIFICATIONS ---
    const btnNotif = document.getElementById('btn-notifications');
    const notifDropdown = document.getElementById('notif-dropdown');
    const notifBadge = document.getElementById('notif-badge');
    const notifList = document.getElementById('notif-list');

    if (btnNotif && user) {
        btnNotif.addEventListener('click', async () => {
            notifDropdown.classList.toggle('hidden');
            if (!notifDropdown.classList.contains('hidden')) {
                await fetch(`${API_URL}/notifications/read/${user.id}`, { method: 'POST' });
                notifBadge.classList.add('hidden');
            }
        });

        document.addEventListener('click', (e) => {
            if (!btnNotif.contains(e.target) && !notifDropdown.contains(e.target)) {
                notifDropdown.classList.add('hidden');
            }
        });

        let isInitialNotifLoad = true;
        const shownNotifications = new Set();

        async function showToastNotification(n) {
            // No mostrar Toasts de chat si ya estamos chateando con esa misma persona en la vista de Nodos
            if (window.location.pathname.endsWith('/nodes') && typeof activeChatUser !== 'undefined' && activeChatUser == n.sender_id) {
                return;
            }

            let toastContainer = document.getElementById('toast-container');
            if (!toastContainer) {
                toastContainer = document.createElement('div');
                toastContainer.id = 'toast-container';
                document.body.appendChild(toastContainer);
            }

            const toast = document.createElement('div');
            const isMeetup = n.type === 'meetup' || n.type === 'meetup_interest';
            const themeClass = n.type === 'message' ? 'toast-secondary' : (n.type === 'meetup_interest' ? 'toast-accent' : '');
            toast.className = `toast-item ${themeClass}`;

            const headerText = n.type === 'message' ? 'TRANSMISIÓN DE CHAT' : (isMeetup ? 'RADAR DE ACTIVIDAD' : 'ALERTA DE FRECUENCIA');
            const icon = n.type === 'message' ? 'chat_bubble' : (isMeetup ? 'add_location_alt' : 'notifications');
            const actionText = n.type === 'message' ? 'HAGA CLIC PARA ABRIR CHAT' : (isMeetup ? 'HAGA CLIC PARA VER MEETUPS' : 'HAGA CLIC PARA VER');

            if (isMeetup && window.soundEffects) {
                window.soundEffects.playNotification();
            }

            let bodyText = "";
            if (n.type === 'like') bodyText = `A @${n.sender_name} le gustó tu transmisión.`;
            else if (n.type === 'comment') bodyText = `@${n.sender_name} comentó tu reporte.`;
            else if (n.type === 'share') bodyText = `@${n.sender_name} retransmitió tu reporte.`;
            else if (n.type === 'meetup') bodyText = `¡@${n.sender_name} inició un Meetup cerca de ti!`;
            else if (n.type === 'meetup_interest') bodyText = `🔥 ¡Interés Compartido! @${n.sender_name} inició un Meetup de actividad cerca de ti.`;
            else if (n.type === 'message') {
                try {
                    const msgRes = await fetch(`${API_URL}/messages/${user.id}/${n.sender_id}`);
                    const msgs = await msgRes.json();
                    const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1].content : "Mensaje cifrado recibido.";
                    const preview = lastMsg.length > 35 ? lastMsg.substring(0, 32) + '...' : lastMsg;
                    bodyText = `De @${n.sender_name}: "${preview}"`;
                } catch (e) {
                    bodyText = `De @${n.sender_name}: mensaje cifrado entrante.`;
                }
            }

            toast.innerHTML = `
                <div class="toast-header">
                    <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">${icon}</span> ${headerText}</span>
                    <button class="toast-close">&times;</button>
                </div>
                <div class="toast-body">
                    ${bodyText}
                </div>
                <div class="toast-footer font-status-code">
                    ${actionText}
                </div>
            `;

            if (window.soundEffects) {
                window.soundEffects.playNotification();
            }

            toast.querySelector('.toast-close').addEventListener('click', (e) => {
                e.stopPropagation();
                dismissToast(toast);
            });

            toast.addEventListener('click', () => {
                dismissToast(toast);
                if (n.type === 'message') {
                    if (window.location.pathname.endsWith('/nodes') || window.location.pathname.includes('/nodes')) {
                        const targetBtn = document.querySelector(`.btn-open-chat[data-id="${n.sender_id}"]`);
                        if (targetBtn) targetBtn.click();
                    } else {
                        window.location.href = `/nodes?chat_user=${n.sender_id}`;
                    }
                } else {
                    if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '') {
                        if (n.target_id) {
                            openThreadModal(n.target_id);
                        }
                    } else {
                        if (n.target_id) {
                            window.location.href = `/?open_post=${n.target_id}`;
                        }
                    }
                }
            });

            toastContainer.appendChild(toast);

            setTimeout(() => {
                if (toast.parentNode) {
                    dismissToast(toast);
                }
            }, 6000);
        }

        function dismissToast(toast) {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        }

        async function fetchNotifications() {
            try {
                const res = await fetch(`${API_URL}/notifications/${user.id}`);
                const data = await res.json();
                
                const unread = data.some(n => !n.is_read);
                if (unread) {
                    notifBadge.classList.remove('hidden');
                } else {
                    notifBadge.classList.add('hidden');
                }

                if (data.length === 0) {
                    notifList.innerHTML = '<li class="p-2 text-center text-outline text-xs">Sin notificaciones</li>';
                } else {
                    notifList.innerHTML = data.map(n => {
                        let text = "";
                        if (n.type === 'like') text = `A <b class="text-primary">${n.sender_name}</b> le gustó tu publicación.`;
                        if (n.type === 'comment') text = `<b class="text-primary">${n.sender_name}</b> comentó tu publicación.`;
                        if (n.type === 'message') text = `<b class="text-primary">${n.sender_name}</b> te envió un mensaje cifrado.`;
                        if (n.type === 'share') text = `<b class="text-primary">${n.sender_name}</b> compartió tu publicación.`;
                        if (n.type === 'meetup') text = `¡<b class="text-primary">${n.sender_name}</b> inició un Meetup cerca de ti!`;
                        if (n.type === 'meetup_interest') text = `🔥 <span class="text-secondary font-bold">★ Interés común ★</span> ¡<b class="text-primary">${n.sender_name}</b> inició un Meetup!`;
                        if (n.type === 'emergency') text = `<span class="text-error font-bold flex items-center gap-1"><span class="material-symbols-outlined text-xs animate-pulse">crisis_alert</span> DIFUSIÓN DE EMERGENCIA</span>`;
                        return `<li class="p-3 border-b border-outline-variant/30 text-xs cursor-pointer hover:bg-primary/5 transition-colors ${!n.is_read ? 'bg-primary/10' : ''}" data-type="${n.type}" data-target-id="${n.target_id || ''}" data-sender-id="${n.sender_id}">${text}</li>`;
                    }).join('');

                    notifList.querySelectorAll('li').forEach(li => {
                        li.addEventListener('click', () => {
                            const type = li.dataset.type;
                            const targetId = li.dataset.targetId;
                            const senderId = li.dataset.senderId;

                            if (type === 'message') {
                                if (window.location.pathname.endsWith('/nodes') || window.location.pathname.includes('/nodes')) {
                                    const targetBtn = document.querySelector(`.btn-open-chat[data-id="${senderId}"]`);
                                    if (targetBtn) {
                                        targetBtn.click();
                                    }
                                } else {
                                    window.location.href = `/nodes?chat_user=${senderId}`;
                                }
                            } else if (type === 'meetup' || type === 'meetup_interest') {
                                if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '') {
                                    highlightColumn('column-radar');
                                } else {
                                    window.location.href = '/';
                                }
                            } else {
                                if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname === '') {
                                    if (targetId) {
                                        openThreadModal(targetId);
                                    }
                                } else {
                                    if (targetId) {
                                        window.location.href = `/?open_post=${targetId}`;
                                    }
                                }
                            }
                            if (notifDropdown) {
                                notifDropdown.classList.add('hidden');
                            }
                        });
                    });
                }
 
                // Procesar Toasts para nuevas notificaciones no leídas
                data.forEach(n => {
                    if (!n.is_read && !shownNotifications.has(n.id)) {
                        if (n.type === 'emergency') {
                            triggerEmergencySiren(`ALERTA CRÍTICA DE @${n.sender_name.toUpperCase()}: DIFUSIÓN DE EMERGENCIA EN FRECUENCIA GENERAL.`);
                        } else if (!isInitialNotifLoad) {
                            showToastNotification(n);
                        }
                        shownNotifications.add(n.id);
                    }
                });

                isInitialNotifLoad = false;
            } catch(e) {}
        }
        
        window.fetchNotifications = fetchNotifications;
        fetchNotifications();
        setInterval(fetchNotifications, 5000);
    }

    // --- SMOOTH SCROLL FOR NAVIGATION (MOBILE RESPONSIVE NAVIGATION) ---
    const navMap = document.getElementById('nav-map');
    const navFeed = document.getElementById('nav-feed');
    const navRadar = document.getElementById('nav-radar');

    function highlightColumn(colId) {
        const col = document.getElementById(colId);
        if (col) {
            col.scrollIntoView({ behavior: 'smooth' });
            
            // Visual feedback
            const container = col.querySelector('.bg-surface-container-low\\/90') || col.firstElementChild;
            if (container) {
                const originalShadow = container.style.boxShadow;
                const originalTransition = container.style.transition;
                
                container.style.transition = 'box-shadow 0.3s ease-in-out';
                container.style.boxShadow = '0 0 30px rgba(0, 242, 255, 0.6)';
                
                setTimeout(() => {
                    container.style.boxShadow = originalShadow;
                    setTimeout(() => {
                        container.style.transition = originalTransition;
                    }, 300);
                }, 800);
            }
        }
    }

    if (navMap) {
        navMap.addEventListener('click', (e) => {
            if (document.getElementById('column-map')) {
                e.preventDefault();
                highlightColumn('column-map');
            }
        });
    }
    if (navFeed) {
        navFeed.addEventListener('click', (e) => {
            if (document.getElementById('column-feed')) {
                e.preventDefault();
                highlightColumn('column-feed');
            }
        });
    }
    if (navRadar) {
        navRadar.addEventListener('click', (e) => {
            if (document.getElementById('column-radar')) {
                e.preventDefault();
                highlightColumn('column-radar');
            }
        });
    }

    // --- STAGE SELECTION BY MAP POLYGON CLICK ---
    let currentFilterMunicipality = null;

    // --- FEED LOGIC ---
    const feedContainer = document.getElementById('feed-container');
    let currentFeedPostsJson = '';

    async function loadFeed() {
        if (!feedContainer || !user) return;
        try {
            let coordsParam = '';
            if (realUserCoords) {
                coordsParam = `&user_lat=${realUserCoords.lat}&user_lon=${realUserCoords.lon}`;
            } else if (user.latitude && user.longitude) {
                coordsParam = `&user_lat=${user.latitude}&user_lon=${user.longitude}`;
            }
            const res = await fetch(`${API_URL}/posts?user_id=${user.id}${coordsParam}`);
            let posts = await res.json();
            
            // Filter by municipality if one is selected
            if (currentFilterMunicipality) {
                posts = posts.filter(p => p.location.toLowerCase() === currentFilterMunicipality.toLowerCase());
            }

            // Save JSON representation to avoid redundant redraws
            currentFeedPostsJson = JSON.stringify(posts.map(p => ({
                id: p.id,
                content: p.content,
                likes_count: p.likes_count,
                comments_count: p.comments_count,
                has_power: p.has_power,
                image: p.image
            })));

            feedContainer.innerHTML = '';

            if (posts.length === 0) {
                feedContainer.innerHTML = `
                <div class="p-8 text-center bg-surface-container-low/90 backdrop-blur-md rounded-lg border border-outline-variant text-outline">
                    <span class="material-symbols-outlined text-[32px] mb-2 animate-pulse">signal_wifi_off</span>
                    <p class="font-label-caps text-xs">NO HAY TRANSMISIONES EN ESTA FRECUENCIA</p>
                    ${currentFilterMunicipality ? `<button id="btn-clear-filter" class="mt-4 text-xs text-primary underline">Mostrar todos los sectores</button>` : ''}
                </div>`;
                
                const btnClear = document.getElementById('btn-clear-filter');
                if (btnClear) {
                    btnClear.addEventListener('click', () => {
                        currentFilterMunicipality = null;
                        document.querySelectorAll('#vector-map polygon').forEach(p => p.classList.remove('stroke-primary', 'stroke-2'));
                        loadFeed();
                    });
                }
                return;
            }

            posts.forEach(p => {
                const article = document.createElement('article');
                
                let isLocked = false;
                let distance = 0;
                if (p.drop_radius) {
                    if (realUserCoords) {
                        let targetLat = p.latitude;
                        let targetLon = p.longitude;
                        if (targetLat === null || targetLon === null) {
                            if (p.location) {
                                const targetMeta = MUNICIPALITY_METADATA[p.location];
                                const targetPos = parseCoords(targetMeta?.coords);
                                if (targetPos) {
                                    targetLat = targetPos.lat;
                                    targetLon = targetPos.lon;
                                }
                            }
                        }
                        if (targetLat !== null && targetLon !== null) {
                            distance = getHaversineDistance(realUserCoords.lat, realUserCoords.lon, targetLat, targetLon);
                        } else {
                            distance = getMunicipalityDistance(user.location, p.location);
                        }
                    } else {
                        distance = getMunicipalityDistance(user.location, p.location);
                    }
                    distance = Math.round(distance * 10) / 10;
                    if (distance > p.drop_radius) {
                        isLocked = true;
                    }
                }

                if (isLocked) {
                    article.className = "bg-surface-container-low/90 backdrop-blur-md rounded-lg border border-outline-variant overflow-hidden mb-6 locked-drop-card transition-all duration-300";
                } else if (p.is_time_capsule === 1) {
                    if (p.time_capsule_locked === 1) {
                        article.className = "bg-surface-container-low/80 backdrop-blur-md rounded-lg border border-secondary/30 overflow-hidden mb-6 opacity-80 transition-all duration-300";
                    } else {
                        article.className = "bg-surface-container-low/95 backdrop-blur-md rounded-lg border border-success/40 shadow-[0_0_10px_rgba(74,222,128,0.15)] overflow-hidden mb-6 glow-accent-hover transition-all duration-300";
                    }
                } else {
                    article.className = "bg-surface-container-low/90 backdrop-blur-md rounded-lg border border-outline-variant overflow-hidden mb-6 glow-accent-hover transition-all duration-300";
                }

                let optionsHTML = '';
                if (user && p.user_id === user.id && !isLocked) {
                    optionsHTML = `
                    <div class="flex items-center gap-1 ml-2">
                        <button class="hover:text-primary transition-colors p-1 btn-edit-post" data-id="${p.id}" title="Editar Transmisión">
                            <span class="material-symbols-outlined text-[15px]">edit</span>
                        </button>
                        <button class="hover:text-error transition-colors p-1 btn-delete-post" data-id="${p.id}" title="Eliminar Transmisión">
                            <span class="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                    </div>
                    `;
                }
                
                const mediaHTML = (p.image && !isLocked) ? `
                <div class="w-full max-h-[500px] bg-surface-dim relative border-y border-outline-variant/30 overflow-hidden cursor-pointer btn-open-thread flex justify-center items-center" data-id="${p.id}">
                    <img src="${p.image}" class="max-w-full max-h-[500px] h-auto object-contain opacity-85 hover:opacity-100 transition-opacity duration-300">
                </div>` : '';

                const statusIndicatorClass = p.has_power ? "bg-primary shadow-[0_0_8px_#00f2ff] pulse-breathe" : "bg-error shadow-[0_0_8px_#ffb4ab] pulse-strobe";

                const sharedHTML = (p.original_post_id && !isLocked) ? `
                <div class="mx-3 mt-3 p-3 border border-outline-variant/50 rounded bg-surface-dim/50 italic text-xs text-on-surface-variant">
                    <span class="text-[9px] font-label-caps text-outline mb-1 block">RETRANSMISIÓN DE NODO: ${p.original_author ? p.original_author.toUpperCase() : 'DESCONOCIDO'}</span>
                    "${p.original_content}"
                </div>
                ` : '';

                const displayContent = isLocked 
                    ? `<span class="font-status-code text-error flex items-center gap-1.5"><span class="material-symbols-outlined text-[16px]">lock</span>[SEÑAL BLOQUEADA: FUERA DE RANGO. DISTANCIA: ${distance} KM / ALCANCE: ${p.drop_radius} KM]</span>`
                    : p.content;

                let pollHTML = '';
                if (p.has_poll && p.poll_stats && !isLocked) {
                    const stats = p.poll_stats;
                    const total = stats.total_count || 0;
                    const opt1Pct = total > 0 ? Math.round((stats.opt1_count / total) * 100) : 0;
                    const opt2Pct = total > 0 ? Math.round((stats.opt2_count / total) * 100) : 0;
                    const hasVoted = stats.user_voted_option !== null;
                    
                    pollHTML = `
                    <div class="mt-3 p-3 border border-outline-variant/30 rounded bg-surface-dim/40 flex flex-col gap-2 font-mono text-xs">
                        <div class="font-bold text-primary flex items-center gap-1.5 mb-1">
                            <span class="material-symbols-outlined text-[16px]">poll</span>
                            <span>ENCUESTA DE TELEMETRÍA: ${p.poll_question}</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between items-center text-[10px]">
                                <span>SÍ (ESTABLE)</span>
                                <span class="font-status-code">${stats.opt1_count} votos (${opt1Pct}%)</span>
                            </div>
                            <div class="poll-bar-bg">
                                <div class="poll-bar-fill" style="width: ${opt1Pct}%"></div>
                            </div>
                        </div>
                        <div class="flex flex-col gap-1">
                            <div class="flex justify-between items-center text-[10px]">
                                <span>NO (CRÍTICO)</span>
                                <span class="font-status-code">${stats.opt2_count} votos (${opt2Pct}%)</span>
                            </div>
                            <div class="poll-bar-bg">
                                <div class="poll-bar-fill bg-error shadow-[0_0_8px_rgba(255,180,171,0.4)]" style="width: ${opt2Pct}%"></div>
                            </div>
                        </div>
                        ${!hasVoted ? `
                        <div class="flex gap-2 mt-2">
                            <button class="flex-1 py-1 px-2 border border-primary/40 hover:bg-primary/10 text-primary text-[10px] rounded transition-all btn-vote" data-post-id="${p.id}" data-option="opt1">SÍ</button>
                            <button class="flex-1 py-1 px-2 border border-error/40 hover:bg-error/10 text-error text-[10px] rounded transition-all btn-vote" data-post-id="${p.id}" data-option="opt2">NO</button>
                        </div>
                        ` : `
                        <div class="text-[9px] text-outline mt-1 italic text-center">
                            Reporte registrado (Opción: ${stats.user_voted_option === 'opt1' ? 'SÍ' : 'NO'})
                        </div>
                        `}
                    </div>
                    `;
                }

                const openThreadBtnClass = isLocked ? "opacity-30 pointer-events-none" : "btn-open-thread";

                let capsuleHTML = '';
                if (p.is_time_capsule === 1) {
                    if (p.time_capsule_locked === 1) {
                        capsuleHTML = `
                        <div class="mx-3 mt-2 px-2.5 py-1 rounded bg-secondary/10 border border-secondary/30 text-[9px] font-label-caps text-secondary flex items-center gap-1.5 w-fit select-none">
                            <span class="material-symbols-outlined text-[13px] animate-pulse">lock</span>
                            <span>CÁPSULA DEL TIEMPO (GPS CIFRADO - BLOQUEADA)</span>
                        </div>
                        `;
                    } else {
                        capsuleHTML = `
                        <div class="mx-3 mt-2 px-2.5 py-1 rounded bg-success/20 border border-success/40 text-[9px] font-label-caps text-success flex items-center gap-1.5 w-fit select-none shadow-[0_0_8px_rgba(74,222,128,0.2)]">
                            <span class="material-symbols-outlined text-[13px]">lock_open</span>
                            <span>CÁPSULA DESBLOQUEADA GPS (RANGO OK)</span>
                        </div>
                        `;
                    }
                }

                article.innerHTML = `
                <div class="p-3 flex items-center justify-between border-b border-outline-variant/50">
                    <div class="flex items-center gap-3">
                        <div class="w-8 h-8 rounded-full overflow-hidden border ${p.has_power ? 'border-primary' : 'border-error'} relative">
                            <img alt="Author" class="w-full h-full object-cover" src="${p.avatar}"/>
                        </div>
                        <div class="flex flex-col">
                            <span class="font-status-code text-sm text-on-surface">${p.name} <span class="text-outline text-xs">@${p.username}</span></span>
                            <span class="font-label-caps text-[10px] text-outline flex items-center gap-1">
                                <span class="material-symbols-outlined text-[12px]">location_on</span> ${p.location.toUpperCase()}
                            </span>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <div class="w-2.5 h-2.5 rounded-full ${statusIndicatorClass}"></div>
                        ${optionsHTML}
                    </div>
                </div>
                ${sharedHTML}
                ${capsuleHTML}
                ${mediaHTML}
                <div class="p-3 flex flex-col gap-2">
                    <p id="post-content-text-${p.id}" class="font-body-md text-sm text-on-surface-variant ${isLocked ? '' : 'cursor-pointer btn-open-thread'}" data-id="${p.id}">${displayContent}</p>
                    ${pollHTML}
                    <div class="flex justify-between items-center text-outline mt-2 pt-2 border-t border-outline-variant/30">
                        <div class="flex gap-4">
                            <button class="hover:text-primary transition-colors flex items-center gap-1 btn-like" data-id="${p.id}" ${isLocked ? 'disabled' : ''}>
                                <span class="material-symbols-outlined text-[18px] ${p.user_liked ? 'text-primary' : ''}">favorite</span>
                                <span class="text-xs font-status-code">${p.like_count}</span>
                            </button>
                            <button class="hover:text-primary transition-colors flex items-center gap-1 ${openThreadBtnClass}" data-id="${p.id}" ${isLocked ? 'disabled' : ''}>
                                <span class="material-symbols-outlined text-[18px]">chat_bubble</span>
                                <span class="text-xs font-status-code">${p.comment_count}</span>
                            </button>
                            <button class="hover:text-primary transition-colors flex items-center gap-1 btn-share" data-id="${p.id}" data-content="${p.content}" data-author="${p.name}" ${isLocked ? 'disabled' : ''}>
                                <span class="material-symbols-outlined text-[18px]">share</span>
                            </button>
                        </div>
                        <span class="font-label-caps text-[9px] text-outline">${new Date(p.created_at).toLocaleString()}</span>
                    </div>
                </div>
                `;
                feedContainer.appendChild(article);
            });
            attachFeedEvents();
        } catch(e) {
            console.error(e);
        }
    }

    function attachFeedEvents() {
        document.querySelectorAll('.btn-like').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                await fetch(`${API_URL}/posts/${id}/like`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({ user_id: user.id })
                });
                if (window.soundEffects) window.soundEffects.playLike();
                loadFeed();
            });
        });

        document.querySelectorAll('.btn-vote').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const postId = btn.dataset.postId;
                const option = btn.dataset.option;
                try {
                    const res = await fetch(`${API_URL}/posts/${postId}/vote`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({ user_id: user.id, vote_option: option })
                    });
                    if (res.ok) {
                        if (window.soundEffects) window.soundEffects.playClick();
                        loadFeed();
                        updateMapVisuals();
                    }
                } catch (err) {
                    console.error("Error voting:", err);
                }
            });
        });

        document.querySelectorAll('.btn-open-thread').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                openThreadModal(id);
            });
        });

        // Share functionality
        const shareModal = document.getElementById('share-modal');
        if (shareModal) {
            document.querySelectorAll('.btn-share').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;
                    const content = btn.dataset.content;
                    const author = btn.dataset.author;
                    document.getElementById('share-original-content').textContent = `"${content}" - ${author}`;
                    document.getElementById('share-post-id').value = id;
                    shareModal.classList.remove('hidden');
                });
            });

            document.getElementById('close-share-modal').addEventListener('click', () => {
                shareModal.classList.add('hidden');
            });

            document.getElementById('btn-confirm-share').addEventListener('click', async () => {
                const id = document.getElementById('share-post-id').value;
                const text = document.getElementById('share-text').value;
                
                await fetch(`${API_URL}/posts`, {
                    method: 'POST',
                    headers: {'Content-Type':'application/json'},
                    body: JSON.stringify({
                        user_id: user.id,
                        content: text || "He compartido esto.",
                        has_power: true,
                        original_post_id: id
                    })
                });
                shareModal.classList.add('hidden');
                document.getElementById('share-text').value = '';
                loadFeed();
            });
        }

        // Edit post click handler
        document.querySelectorAll('.btn-edit-post').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                const pEl = document.getElementById(`post-content-text-${id}`);
                if (!pEl) return;
                
                if (pEl.querySelector('.edit-textarea')) return;
                
                // Retrieve original post object from stored list or fallback to DOM content
                const originalText = pEl.textContent;
                
                pEl.className = "font-body-md text-sm text-on-surface-variant";
                pEl.innerHTML = `
                    <textarea class="edit-textarea w-full bg-surface-variant text-on-surface text-sm rounded p-2 outline-none focus:border-primary border border-primary/30 mt-1 resize-none h-16 font-body-md" required>${originalText}</textarea>
                    <div class="flex gap-2 justify-end mt-2">
                        <button class="px-2 py-0.5 border border-outline-variant hover:border-on-surface hover:text-on-surface text-[10px] font-label-caps rounded btn-edit-cancel" data-id="${id}">CANCELAR</button>
                        <button class="px-2 py-0.5 bg-primary text-on-primary hover:shadow-[0_0_8px_rgba(0,242,255,0.4)] text-[10px] font-label-caps rounded btn-edit-save" data-id="${id}">GUARDAR</button>
                    </div>
                `;
                
                pEl.querySelector('.btn-edit-cancel').addEventListener('click', (ev) => {
                    ev.stopPropagation();
                    loadFeed();
                });
                
                pEl.querySelector('.btn-edit-save').addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    const newText = pEl.querySelector('.edit-textarea').value;
                    if (!newText.trim()) return;
                    
                    try {
                        const res = await fetch(`${API_URL}/posts/${id}/edit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ user_id: user.id, content: newText.trim() })
                        });
                        if (res.ok) {
                            if (window.soundEffects) window.soundEffects.playTransmit();
                            triggerGlitchEffect();
                            loadFeed();
                        }
                    } catch (err) {
                        console.error("Error editing post:", err);
                    }
                });
            });
        });

        // Delete post click handler
        document.querySelectorAll('.btn-delete-post').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;
                
                if (!confirm("¿SEGURO QUE DESEA ELIMINAR ESTA TRANSMISIÓN?")) return;
                
                try {
                    const res = await fetch(`${API_URL}/posts/${id}`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id })
                    });
                    if (res.ok) {
                        if (window.soundEffects) window.soundEffects.playGlitchSound();
                        triggerGlitchEffect();
                        loadFeed();
                        updateMapVisuals();
                    }
                } catch (err) {
                    console.error("Error deleting post:", err);
                }
            });
        });
    }

    async function silentCheckAndLoadFeed() {
        if (!feedContainer || !user) return;
        try {
            const res = await fetch(`${API_URL}/posts?user_id=${user.id}`);
            let posts = await res.json();
            
            if (currentFilterMunicipality) {
                posts = posts.filter(p => p.location.toLowerCase() === currentFilterMunicipality.toLowerCase());
            }
            
            const postsJson = JSON.stringify(posts.map(p => ({
                id: p.id,
                content: p.content,
                likes_count: p.likes_count,
                comments_count: p.comments_count,
                has_power: p.has_power,
                image: p.image
            })));
            
            if (postsJson !== currentFeedPostsJson) {
                currentFeedPostsJson = postsJson;
                await loadFeed();
            }
        } catch (err) {
            console.error("Error in silent feed check:", err);
        }
    }

    // Scroll listener to update posts on scroll (throttled to at most once every 4 seconds)
    let lastFeedScrollTime = 0;
    window.addEventListener('scroll', () => {
        if (!user) return;
        const now = Date.now();
        if (now - lastFeedScrollTime > 4000) {
            lastFeedScrollTime = now;
            silentCheckAndLoadFeed();
        }
    });

    // Check periodically in the background every 10 seconds for constant updates
    setInterval(silentCheckAndLoadFeed, 10000);

    // --- CREATE POST WITH FILE UPLOAD INDICATOR ---
    const btnTransmit = document.getElementById('btn-transmit');
    const imageInput = document.getElementById('post-image');
    const imageName = document.getElementById('post-image-name');
    
    if (imageInput && imageName) {
        imageInput.addEventListener('change', () => {
            if (imageInput.files[0]) {
                imageName.textContent = imageInput.files[0].name;
            } else {
                imageName.textContent = '';
            }
        });
    }

    if (btnTransmit) {
        btnTransmit.addEventListener('click', async () => {
            const text = document.getElementById('post-text').value;
            const hasPower = document.getElementById('post-pwr').checked;
            
            if (!text.trim()) return;

            const formData = new FormData();
            formData.append('user_id', user.id);
            formData.append('content', text);
            formData.append('has_power', hasPower);
            if (imageInput && imageInput.files[0]) {
                formData.append('image', imageInput.files[0]);
            }

            // Expanded Cyberpunk properties
            const dropRadius = document.getElementById('post-drop-radius')?.value;
            if (dropRadius) {
                formData.append('drop_radius', dropRadius);
            }
            
            const isEmergency = document.getElementById('post-emergency')?.checked;
            formData.append('is_emergency', isEmergency ? 'true' : 'false');
            
            const isTimeCapsule = document.getElementById('post-time-capsule')?.checked;
            formData.append('is_time_capsule', isTimeCapsule ? 'true' : 'false');

            const pollBuilderPanel = document.getElementById('poll-builder-panel');
            const pollQuestion = document.getElementById('poll-builder-question')?.value;
            if (pollBuilderPanel && !pollBuilderPanel.classList.contains('hidden') && pollQuestion && pollQuestion.trim()) {
                formData.append('has_poll', 'true');
                formData.append('poll_question', pollQuestion.trim());
            }

            try {
                const res = await fetch(`${API_URL}/posts`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    document.getElementById('post-text').value = '';
                    if (imageInput) imageInput.value = '';
                    if (imageName) imageName.textContent = '';
                    
                    // Reset fields
                    if (document.getElementById('post-drop-radius')) {
                        document.getElementById('post-drop-radius').value = '';
                    }
                    if (document.getElementById('post-emergency')) {
                        document.getElementById('post-emergency').checked = false;
                    }
                    if (document.getElementById('post-time-capsule')) {
                        document.getElementById('post-time-capsule').checked = false;
                    }
                    if (document.getElementById('poll-builder-question')) {
                        document.getElementById('poll-builder-question').value = '';
                    }
                    if (pollBuilderPanel) {
                        pollBuilderPanel.classList.add('hidden');
                    }

                    if (isEmergency) {
                        triggerGlitchEffect();
                    }

                    if (window.soundEffects) window.soundEffects.playTransmit();
                    loadFeed();
                    updateMapVisuals();
                }
            } catch (err) {
                console.error("Error creating post:", err);
            }
        });
    }

    // --- STORIES: NODES IN RANGE BAR ---
    const storiesContainer = document.getElementById('stories-container');
    
    async function loadStories() {
        if (!storiesContainer || !user) return;
        try {
            const res = await fetch(`${API_URL}/users`);
            const users = await res.json();
            
            // Build dynamic stories markup
            storiesContainer.innerHTML = users.map(u => {
                const isMe = u.id === user.id;
                const borderGlow = (u.id % 2 === 0) ? 'from-primary to-primary-container' : 'from-error to-surface-variant';
                const grayscaleClass = (u.id % 2 !== 0) ? 'grayscale opacity-75' : '';
                return `
                <div class="flex flex-col items-center gap-1 min-w-[70px] cursor-pointer group btn-story-node" data-id="${u.id}" data-name="${u.name}">
                    <div class="w-14 h-14 rounded-full p-[2px] bg-gradient-to-tr ${borderGlow} group-hover:shadow-[0_0_12px_rgba(0,242,255,0.4)] transition-all">
                        <div class="w-full h-full rounded-full bg-surface border-2 border-background overflow-hidden">
                            <img alt="${u.name}" class="w-full h-full object-cover ${grayscaleClass}" src="${u.avatar}"/>
                        </div>
                    </div>
                    <span class="font-label-caps text-[9px] text-on-surface-variant truncate w-full text-center">${isMe ? 'MI_NODO' : u.username.toUpperCase()}</span>
                </div>
                `;
            }).join('');

            // Click story to open private chat with that node
            document.querySelectorAll('.btn-story-node').forEach(story => {
                story.addEventListener('click', () => {
                    const targetId = story.dataset.id;
                    if (targetId == user.id) return; // ignore clicking self
                    window.location.href = `/nodes?chat_user=${targetId}`;
                });
            });

        } catch(e) {
            console.error(e);
        }
    }

    // --- MAP TELEMETRY ---
    async function updateMapVisuals() {
        const mapPolygons = document.querySelectorAll('#vector-map polygon');
        if (mapPolygons.length === 0) return;

        try {
            const res = await fetch(`${API_URL}/stats/map`);
            const data = await res.json();

            const stats = {};
            data.forEach(d => {
                if (!stats[d.location]) stats[d.location] = { withPower: 0, noPower: 0 };
                if (d.has_power) stats[d.location].withPower = d.users_count;
                else stats[d.location].noPower = d.users_count;
            });

            mapPolygons.forEach(polygon => {
                const municipality = polygon.getAttribute('data-municipality');
                if (!municipality) return;

                const stat = stats[municipality] || { withPower: 0, noPower: 0 };
                
                polygon.classList.remove(
                    'fill-error/20', 'fill-error/60', 'stroke-error', 'hover:fill-error/40', 'hover:fill-error/80', 'pulse-strobe', 'stroke-2', 'stroke-1',
                    'fill-primary/20', 'fill-primary/60', 'stroke-primary', 'hover:fill-primary/40', 'hover:fill-primary/80',
                    'fill-surface-variant/40', 'fill-surface-variant/20', 'stroke-surface-variant', 'hover:fill-surface-variant/60', 'hover:fill-surface-variant/40'
                );

                if (stat.noPower > 0 && stat.noPower >= stat.withPower) {
                    polygon.classList.add('fill-error/60', 'stroke-error', 'stroke-2', 'hover:fill-error/80', 'pulse-strobe');
                } else if (stat.withPower > 0) {
                    polygon.classList.add('fill-primary/60', 'stroke-primary', 'stroke-2', 'hover:fill-primary/80');
                } else {
                    polygon.classList.add('fill-surface-variant/20', 'stroke-surface-variant', 'stroke-1', 'hover:fill-surface-variant/40');
                }
                
                polygon.dataset.statsWith = stat.withPower;
                polygon.dataset.statsNo = stat.noPower;
            });
            if (typeof updateHUD === 'function') {
                updateHUD(currentFilterMunicipality);
            }
        } catch (err) {
            console.error(err);
        }
    }
    
    // Map setup on DOM
    const mapPolygons = document.querySelectorAll('#vector-map polygon');
    if (mapPolygons.length > 0) {
        // --- Helper to update HUD details ---
        function updateHUD(mName) {
            const btnHudAction = document.getElementById('btn-hud-action');
            const lockStatus = document.getElementById('hud-lock-status');
            const hudCoords = document.getElementById('hud-coordinates');
            const hudBandwidth = document.getElementById('hud-telemetry-bandwidth');

            if (!mName) {
                if (lockStatus) {
                    lockStatus.textContent = "STANDBY";
                    lockStatus.className = "font-bold text-outline";
                }
                if (hudCoords) hudCoords.textContent = "--.----° N, --.----° W";
                if (hudBandwidth) hudBandwidth.textContent = "0.00 MHz";
                if (btnHudAction) {
                    btnHudAction.classList.add('hidden');
                }
                return;
            }

            const poly = document.querySelector(`#vector-map polygon[data-municipality="${mName}"]`);
            const withP = poly ? parseInt(poly.dataset.statsWith || 0) : 0;
            const noP = poly ? parseInt(poly.dataset.statsNo || 0) : 0;
            const metadata = MUNICIPALITY_METADATA[mName] || { coords: "--.----° N, --.----° W", bandwidth: "0.00 MHz" };

            if (lockStatus) {
                lockStatus.textContent = `LOCKED: ${mName.toUpperCase()}`;
                lockStatus.className = noP >= withP && noP > 0 ? "font-bold text-error animate-pulse" : "font-bold text-primary";
            }
            if (hudCoords) hudCoords.textContent = metadata.coords;
            if (hudBandwidth) hudBandwidth.textContent = metadata.bandwidth;

            if (btnHudAction) {
                btnHudAction.classList.remove('hidden');
                btnHudAction.dataset.targetMunicipality = mName;
                if (user && user.location && user.location.toLowerCase() === mName.toLowerCase()) {
                    btnHudAction.textContent = `CONEXIÓN ACTIVA EN ${mName.toUpperCase()}`;
                    btnHudAction.disabled = true;
                    btnHudAction.classList.remove('bg-primary/20', 'text-primary', 'hover:bg-primary/30', 'border-primary/40');
                    btnHudAction.classList.add('bg-outline-variant/20', 'text-outline', 'border-outline-variant/40');
                    btnHudAction.style.cursor = 'default';
                } else {
                    btnHudAction.textContent = `SINTONIZAR NODO: ${mName.toUpperCase()}`;
                    btnHudAction.disabled = false;
                    btnHudAction.classList.add('bg-primary/20', 'text-primary', 'hover:bg-primary/30', 'border-primary/40');
                    btnHudAction.classList.remove('bg-outline-variant/20', 'text-outline', 'border-outline-variant/40');
                    btnHudAction.style.cursor = 'pointer';
                }
            }
        }

        // Listener for the HUD tuning button
        const btnHudAction = document.getElementById('btn-hud-action');
        if (btnHudAction) {
            btnHudAction.addEventListener('click', async () => {
                const targetM = btnHudAction.dataset.targetMunicipality;
                if (!targetM || !user) return;
                
                try {
                    const formData = new FormData();
                    formData.append('name', user.name);
                    formData.append('location', targetM);
                    
                    const res = await fetch(`${API_URL}/users/${user.id}/update`, {
                        method: 'POST',
                        body: formData
                    });
                    const data = res.ok ? await res.json() : null;
                    if (data && data.success) {
                        user.location = data.location;
                        sessionStorage.setItem('currentUser', JSON.stringify(user));
                        localStorage.setItem('locationOverride', 'true');
                        updateUserUI();

                        
                        if (window.soundEffects) {
                            window.soundEffects.playTransmit();
                        }
                        
                        triggerGlitchEffect();
                        updateHUD(targetM);
                        loadFeed();
                        updateMapVisuals();
                        
                        const settingsLocationSelect = document.getElementById('settings-location');
                        if (settingsLocationSelect) {
                            settingsLocationSelect.value = targetM;
                        }
                    }
                } catch (err) {
                    console.error("Error updating location via HUD:", err);
                }
            });
        }

        updateMapVisuals();
        
        let tooltip = document.querySelector('.map-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'map-tooltip hidden bg-surface-container-high border border-outline-variant p-3 rounded shadow-lg fixed pointer-events-none z-50 text-xs text-on-surface';
            document.body.appendChild(tooltip);
        }

        mapPolygons.forEach(polygon => {
            const municipality = polygon.getAttribute('data-municipality');
            
            polygon.addEventListener('mousemove', (e) => {
                tooltip.innerHTML = `
                    <h4 class="font-bold text-primary mb-1">${municipality.toUpperCase()}</h4>
                    <div class="flex gap-2"><span class="text-primary">ESTABLE:</span> <span>${polygon.dataset.statsWith || 0} nodos</span></div>
                    <div class="flex gap-2"><span class="text-error">CORTE:</span> <span>${polygon.dataset.statsNo || 0} nodos</span></div>
                `;
                
                tooltip.classList.remove('hidden');
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';

                // Target lock logic
                const rect = polygon.getBoundingClientRect();
                const mapContainer = polygon.closest('.relative');
                if (mapContainer) {
                    const containerRect = mapContainer.getBoundingClientRect();
                    const x = rect.left - containerRect.left + rect.width / 2;
                    const y = rect.top - containerRect.top + rect.height / 2;
                    
                    const reticle = document.getElementById('map-target-reticle');
                    if (reticle) {
                        reticle.style.display = 'block';
                        reticle.style.left = `${x}px`;
                        reticle.style.top = `${y}px`;
                    }
                }
                
                // Update HUD Panel
                updateHUD(municipality);
            });

            polygon.addEventListener('mouseleave', () => {
                tooltip.classList.add('hidden');
                
                const reticle = document.getElementById('map-target-reticle');
                if (reticle) {
                    reticle.style.display = 'none';
                }
                
                // Reset HUD Panel or lock to active filter
                updateHUD(currentFilterMunicipality);
            });

            // Clicking polygon filters feed by that municipality
            polygon.addEventListener('click', () => {
                mapPolygons.forEach(p => p.classList.remove('stroke-primary', 'stroke-[1.5]'));
                
                if (currentFilterMunicipality === municipality) {
                    currentFilterMunicipality = null;
                    updateHUD(null);
                } else {
                    currentFilterMunicipality = municipality;
                    polygon.classList.add('stroke-primary', 'stroke-[1.5]');
                    updateHUD(municipality);
                }
                loadFeed();
            });
        });
    }

    // --- RPG & MEETUPS OPERATIONS DASHBOARD ---
    const CONQUEST_ZONES_COORDS = {
        obelisco: { name: "Obelisco de Barquisimeto", lat: 10.0694, lon: -69.3567 },
        flor_venezuela: { name: "Flor de Venezuela", lat: 10.0742, lon: -69.2908 },
        manto_maria: { name: "Manto de María", lat: 10.0883, lon: -69.2558 },
        plaza_cabudare: { name: "Plaza Bolívar de Cabudare", lat: 10.0333, lon: -69.2667 },
        tintorero: { name: "Tintorero", lat: 9.9667, lon: -69.5833 },
        cubiro: { name: "Lomas de Cubiro", lat: 9.7833, lon: -69.5667 },
        carora: { name: "Zona Colonial de Carora", lat: 10.1667, lon: -70.0833 },
        unefa_lara: { name: "UNEFA Sede Calle 25", lat: 10.0662, lon: -69.3164 }
    };

    const MUNICIPALITY_CENTERS = {
        "Torres": { x: 21.25, y: 32.5 },
        "Urdaneta": { x: 50, y: 21.25 },
        "Crespo": { x: 76.25, y: 21.25 },
        "Iribarren": { x: 60, y: 46.25 },
        "Palavecino": { x: 82.5, y: 42.5 },
        "Jiménez": { x: 30, y: 61.25 },
        "Morán": { x: 15, y: 80 },
        "Andrés Eloy Blanco": { x: 40, y: 81.25 },
        "Simón Planas": { x: 70, y: 68.75 }
    };

    function getSvgCoords(lat, lon, location) {
        const mName = location || findClosestMunicipality(lat, lon) || "Iribarren";
        const center = MUNICIPALITY_CENTERS[mName] || { x: 60, y: 46.25 };
        const meta = MUNICIPALITY_METADATA[mName];
        if (!meta) return center;
        const metaCoords = parseCoords(meta.coords);
        if (!metaCoords) return center;
        
        const latDiff = lat - metaCoords.lat;
        const lonDiff = lon - metaCoords.lon;
        
        const maxOffset = 12;
        const dx = Math.max(-maxOffset, Math.min(maxOffset, lonDiff * 150));
        const dy = Math.max(-maxOffset, Math.min(maxOffset, -latDiff * 150));
        
        return {
            x: Math.max(5, Math.min(95, center.x + dx)),
            y: Math.max(5, Math.min(95, center.y + dy))
        };
    }

    function drawMapPin(id, x, y, activity, description, username) {
        const svg = document.getElementById('vector-map');
        if (!svg) return;
        
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
        g.setAttribute("class", "map-activity-pin cursor-pointer group");
        g.dataset.id = id;
        
        const outerRing = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        outerRing.setAttribute("cx", x);
        outerRing.setAttribute("cy", y);
        outerRing.setAttribute("r", 4);
        outerRing.setAttribute("fill", "none");
        outerRing.setAttribute("stroke", "#00f2ff");
        outerRing.setAttribute("stroke-width", "0.7");
        outerRing.setAttribute("class", "animate-ping origin-center");
        outerRing.style.transformOrigin = `${x}px ${y}px`;
        
        const innerDot = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        innerDot.setAttribute("cx", x);
        innerDot.setAttribute("cy", y);
        innerDot.setAttribute("r", 2);
        
        let color = "#00f2ff";
        if (activity.toLowerCase().includes("fútbol")) color = "#4ade80";
        else if (activity.toLowerCase().includes("café")) color = "#fb923c";
        else if (activity.toLowerCase().includes("mesa")) color = "#ec4899";
        else if (activity.toLowerCase().includes("música")) color = "#a855f7";
        else if (activity.toLowerCase().includes("charlar")) color = "#2dd4bf";
        else if (activity.toLowerCase().includes("cine")) color = "#f87171";
        
        innerDot.setAttribute("fill", color);
        innerDot.setAttribute("class", "pulse-breathe shadow-[0_0_8px_currentColor]");
        
        g.appendChild(outerRing);
        g.appendChild(innerDot);
        
        g.addEventListener('mouseenter', (e) => {
            let tooltip = document.querySelector('.map-tooltip');
            if (tooltip) {
                tooltip.innerHTML = `
                    <h4 class="font-bold text-secondary mb-1">📌 MEETUP: ${activity.toUpperCase()}</h4>
                    <p class="text-[9px] mb-1">Por: @${username}</p>
                    <p class="italic text-outline-variant">"${description}"</p>
                `;
                tooltip.classList.remove('hidden');
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });
        g.addEventListener('mousemove', (e) => {
            let tooltip = document.querySelector('.map-tooltip');
            if (tooltip) {
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            }
        });
        g.addEventListener('mouseleave', () => {
            let tooltip = document.querySelector('.map-tooltip');
            if (tooltip) tooltip.classList.add('hidden');
        });
        
        g.addEventListener('click', () => {
            highlightColumn('column-radar');
        });
        
        svg.appendChild(g);
    }

    function dismissToast(toast) {
        toast.classList.add('toast-exit');
        toast.addEventListener('animationend', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    function showNotificationToast(title, body, iconName = 'notifications') {
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            document.body.appendChild(toastContainer);
        }

        const toast = document.createElement('div');
        toast.className = 'toast-item';
        toast.innerHTML = `
            <div class="toast-header font-status-code">
                <span class="flex items-center gap-1"><span class="material-symbols-outlined text-[12px]">${iconName}</span> ${title.toUpperCase()}</span>
                <button class="toast-close">&times;</button>
            </div>
            <div class="toast-body text-xs mt-1">
                ${body}
            </div>
        `;
        
        const closeBtn = toast.querySelector('.toast-close');
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            dismissToast(toast);
        });

        toast.addEventListener('click', () => {
            dismissToast(toast);
        });

        toastContainer.appendChild(toast);

        setTimeout(() => {
            if (toast.parentNode) {
                dismissToast(toast);
            }
        }, 5000);
    }

    async function updateOperationsDashboard() {
        if (!user) return;
        
        let myLat = null;
        let myLon = null;
        if (realUserCoords) {
            myLat = realUserCoords.lat;
            myLon = realUserCoords.lon;
        } else if (user.latitude && user.longitude) {
            myLat = user.latitude;
            myLon = user.longitude;
        }
        
        const coordsQuery = myLat !== null ? `?user_lat=${myLat}&user_lon=${myLon}` : '';
        
        try {
            // 1. Fetch and render RPG Status (Missions & Medals)
            const rpgRes = await fetch(`${API_URL}/rpg/status/${user.id}`);
            if (rpgRes.ok) {
                const rpgData = await rpgRes.json();
                const medals = rpgData.medals || [];
                
                const badgeExp = document.getElementById('badge-explorer');
                const badgeHac = document.getElementById('badge-hacker');
                const badgeOp = document.getElementById('badge-operator');
                
                if (badgeExp) {
                    if (medals.includes('EXPLORADOR_NEON')) badgeExp.classList.remove('opacity-40');
                    else badgeExp.classList.add('opacity-40');
                }
                if (badgeHac) {
                    if (medals.includes('HACKER_TEMPORAL')) badgeHac.classList.remove('opacity-40');
                    else badgeHac.classList.add('opacity-40');
                }
                if (badgeOp) {
                    if (medals.includes('OPERADOR_NET')) badgeOp.classList.remove('opacity-40');
                    else badgeOp.classList.add('opacity-40');
                }
                
                const missions = rpgData.missions || [];
                missions.forEach(m => {
                    const valEl = document.getElementById(`mission-${m.id}-val`);
                    const progEl = document.getElementById(`mission-${m.id}-progress`);
                    if (valEl) valEl.textContent = `${m.progress}/${m.target}`;
                    if (progEl) {
                        const pct = Math.min(100, Math.round((m.progress / m.target) * 100));
                        progEl.style.width = `${pct}%`;
                        if (m.completed === 1) {
                            progEl.classList.remove('bg-primary', 'bg-secondary', 'bg-error');
                            progEl.classList.add('bg-success');
                        }
                    }
                });
            }
            
            // 2. Fetch and render Conquest Zones
            const zonesRes = await fetch(`${API_URL}/rpg/zones${coordsQuery}`);
            if (zonesRes.ok) {
                const zones = await zonesRes.json();
                const zonesList = document.getElementById('rpg-zones-list');
                if (zonesList) {
                    zonesList.innerHTML = zones.map(z => {
                        const inRange = z.distance !== null && z.distance <= 0.200; // 200m
                        const distLabel = z.distance !== null 
                            ? (z.distance < 1 ? `${Math.round(z.distance * 1000)}m` : `${z.distance.toFixed(1)}km`)
                            : '--';
                            
                        const checkinBtnStyle = inRange 
                            ? 'bg-primary/20 text-primary border-primary hover:bg-primary/30' 
                            : 'bg-outline-variant/10 text-outline border-outline-variant/30 cursor-not-allowed opacity-50';
                            
                        return `
                        <div class="p-2 rounded bg-surface border border-outline-variant/20 flex flex-col gap-1 text-[10px]">
                            <div class="flex justify-between items-center">
                                <span class="font-bold text-on-surface truncate pr-1">${z.name}</span>
                                <span class="font-status-code text-primary shrink-0">${distLabel}</span>
                            </div>
                            <div class="flex justify-between items-center text-[9px] text-outline">
                                <span>Alcalde: <b class="text-secondary">${z.mayor}</b> (${z.mayor_count} check-ins)</span>
                            </div>
                            <div class="flex gap-1.5 mt-1">
                                <button class="flex-1 py-1 ${checkinBtnStyle} border text-[8px] font-label-caps rounded transition-all btn-checkin" data-id="${z.id}" ${inRange ? '' : 'disabled'}>CHECK-IN</button>
                                <button class="flex-1 py-1 bg-surface-variant/40 hover:bg-surface-variant/75 text-on-surface border border-outline-variant/40 text-[8px] font-label-caps rounded transition-all btn-zone-stories" data-id="${z.id}" data-name="${z.name}">HISTORIAS [${z.stories_count}]</button>
                            </div>
                        </div>
                        `;
                    }).join('');
                    
                    zonesList.querySelectorAll('.btn-checkin').forEach(btn => {
                        btn.addEventListener('click', async (e) => {
                            e.stopPropagation();
                            await performCheckin(btn.dataset.id);
                        });
                    });
                    
                    zonesList.querySelectorAll('.btn-zone-stories').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            openZoneStories(btn.dataset.id, btn.dataset.name);
                        });
                    });
                }
            }
            
            // 3. Fetch Active Meetups and Draw on Map
            const meetupsRes = await fetch(`${API_URL}/meetups/pins${coordsQuery}`);
            if (meetupsRes.ok) {
                const meetups = await meetupsRes.json();
                
                // Clear old pins
                document.querySelectorAll('.map-activity-pin').forEach(el => el.remove());
                
                const meetupsList = document.getElementById('meetups-active-list');
                if (meetupsList) {
                    if (meetups.length === 0) {
                        meetupsList.innerHTML = `<div class="p-2 text-center text-[10px] text-outline bg-surface-dim/40 rounded border border-outline-variant/20 italic">No hay radares activos ahora mismo.</div>`;
                    } else {
                        meetupsList.innerHTML = meetups.map(m => {
                            const distLabel = m.distance !== null 
                                ? (m.distance < 1 ? `${Math.round(m.distance * 1000)}m` : `${m.distance.toFixed(1)}km`)
                                : '--';
                            
                            let actIcon = "⚽";
                            if (m.activity.toLowerCase().includes("café")) actIcon = "☕";
                            else if (m.activity.toLowerCase().includes("mesa")) actIcon = "🎲";
                            else if (m.activity.toLowerCase().includes("música")) actIcon = "🎵";
                            else if (m.activity.toLowerCase().includes("charlar")) actIcon = "💬";
                            else if (m.activity.toLowerCase().includes("cine")) actIcon = "🎬";
                            
                            return `
                            <div class="p-2 rounded bg-surface border border-outline-variant/20 flex flex-col gap-1 text-[9px] hover:border-primary/30 transition-colors">
                                <div class="flex justify-between items-center">
                                    <span class="font-bold text-on-surface">${actIcon} ${m.activity.toUpperCase()} - @${m.username}</span>
                                    <span class="font-status-code text-secondary shrink-0">${distLabel}</span>
                                </div>
                                <p class="text-outline italic">"${m.description}"</p>
                                <div class="flex justify-between items-center mt-1 pt-1 border-t border-outline-variant/10">
                                    <span class="text-[8px] text-outline-variant font-status-code">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    <button class="px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 text-[8px] font-label-caps rounded hover:bg-primary/20 transition-all btn-join-meetup" data-user-id="${m.user_id}">CONECTAR</button>
                                </div>
                            </div>
                            `;
                        }).join('');
                        
                        meetupsList.querySelectorAll('.btn-join-meetup').forEach(btn => {
                            btn.addEventListener('click', () => {
                                window.location.href = `/nodes?chat_user=${btn.dataset.userId}`;
                            });
                        });
                    }
                }
                
                // Draw pins
                meetups.forEach(m => {
                    if (m.latitude !== null && m.longitude !== null) {
                        const svgCoords = getSvgCoords(m.latitude, m.longitude, m.location);
                        drawMapPin(m.id, svgCoords.x, svgCoords.y, m.activity, m.description, m.username);
                    }
                });
            }
            
            // 4. Fetch Users and sort by distance
            const usersRes = await fetch(`${API_URL}/users`);
            if (usersRes.ok) {
                const users = await usersRes.json();
                const radarContainer = document.getElementById('radar-users');
                if (radarContainer) {
                    radarContainer.innerHTML = '';
                    const processedUsers = [];
                    
                    users.forEach(u => {
                        if (u.id === user.id) return;
                        if (!u.is_online) return;
                        
                        let uLat = u.latitude;
                        let uLon = u.longitude;
                        if (uLat === null || uLon === null) {
                            const loc = (u.location && u.location !== 'Anónimo') ? u.location : 'Iribarren';
                            const meta = MUNICIPALITY_METADATA[loc];
                            const coords = parseCoords(meta?.coords);
                            if (coords) {
                                uLat = coords.lat;
                                uLon = coords.lon;
                            }
                        }
                        
                        let dist = Infinity;
                        if (myLat !== null && myLon !== null && uLat !== null && uLon !== null) {
                            dist = getHaversineDistance(myLat, myLon, uLat, uLon);
                        }
                        processedUsers.push({ user: u, dist: dist });
                    });
                    
                    processedUsers.sort((a, b) => a.dist - b.dist);
                    
                    if (processedUsers.length === 0) {
                        radarContainer.innerHTML = '<li class="p-2 text-center text-[10px] text-outline italic">No hay otros nodos conectados.</li>';
                    } else {
                        processedUsers.forEach(({ user: u, dist }) => {
                            const li = document.createElement('li');
                            li.className = "flex justify-between items-center p-1.5 rounded bg-surface hover:bg-surface-variant/30 border border-transparent hover:border-primary/25 cursor-pointer transition-colors text-[10px]";
                            li.dataset.id = u.id;
                            
                            const uLoc = u.location ? u.location.toUpperCase() : '';
                            const distLabel = dist === Infinity ? '--' : (dist < 1 ? `${Math.round(dist * 1000)}m` : `${dist.toFixed(1)} km`);
                            
                            li.innerHTML = `
                                <div class="flex items-center gap-1.5 min-w-0">
                                    <div class="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_4px_#00f2ff] pulse-breathe"></div>
                                    <div class="flex flex-col min-w-0">
                                        <span class="font-status-code text-xs text-on-surface truncate">@${u.username}</span>
                                        ${uLoc ? `<span class="font-label-caps text-[7px] text-outline truncate">${uLoc}</span>` : ''}
                                    </div>
                                </div>
                                <span class="font-label-caps text-[9px] text-outline font-status-code shrink-0">${distLabel}</span>
                            `;
                            
                            li.addEventListener('click', () => {
                                window.location.href = `/nodes?chat_user=${u.id}`;
                            });
                            radarContainer.appendChild(li);
                        });
                    }
                }
            }
            
        } catch (err) {
            console.error("Error updating operations dashboard:", err);
        }
    }

    // Set globally for compatibility
    window.updateRadar = updateOperationsDashboard;

    async function performCheckin(zoneId) {
        let myLat = null;
        let myLon = null;
        if (realUserCoords) {
            myLat = realUserCoords.lat;
            myLon = realUserCoords.lon;
        } else if (user.latitude && user.longitude) {
            myLat = user.latitude;
            myLon = user.longitude;
        }
        
        try {
            const res = await fetch(`${API_URL}/rpg/checkin`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: user.id,
                    zone_id: zoneId,
                    user_lat: myLat,
                    user_lon: myLon
                })
            });
            const data = await res.json();
            if (res.ok) {
                if (window.soundEffects) window.soundEffects.playTransmit();
                showNotificationToast("CONQUISTA", data.message, "explore");
                updateOperationsDashboard();
            } else {
                showNotificationToast("ERROR DE COORDENADAS", data.error, "warning");
            }
        } catch (err) {
            console.error(err);
        }
    }

    // --- GEOLOCATED STORIES MODAL ---
    const zoneStoriesModal = document.getElementById('zone-stories-modal');
    const closeZoneStoriesBtn = document.getElementById('close-zone-stories-modal');
    const formUploadStory = document.getElementById('form-upload-story');
    const storyImage = document.getElementById('story-image');
    const storyImageName = document.getElementById('story-image-name');
    
    if (storyImage && storyImageName) {
        storyImage.addEventListener('change', () => {
            if (storyImage.files[0]) {
                storyImageName.textContent = storyImage.files[0].name;
            } else {
                storyImageName.textContent = '';
            }
        });
    }

    async function openZoneStories(zoneId, zoneName) {
        if (!zoneStoriesModal) return;
        
        document.getElementById('stories-zone-title').textContent = zoneName.toUpperCase();
        document.getElementById('story-zone-id').value = zoneId;
        document.getElementById('story-content').value = '';
        if (storyImage) storyImage.value = '';
        if (storyImageName) storyImageName.textContent = '';
        
        let myLat = null;
        let myLon = null;
        if (realUserCoords) {
            myLat = realUserCoords.lat;
            myLon = realUserCoords.lon;
        } else if (user.latitude && user.longitude) {
            myLat = user.latitude;
            myLon = user.longitude;
        }
        
        let inRange = false;
        const zoneMeta = CONQUEST_ZONES_COORDS[zoneId];
        if (zoneMeta && myLat !== null && myLon !== null) {
            const dist = getHaversineDistance(myLat, myLon, zoneMeta.lat, zoneMeta.lon);
            inRange = dist <= 0.200; // 200m
        }
        
        const uploadContainer = document.getElementById('story-upload-container');
        const uploadRangeError = document.getElementById('story-upload-range-error');
        
        if (inRange) {
            if (uploadContainer) uploadContainer.classList.remove('hidden');
            if (uploadRangeError) uploadRangeError.classList.add('hidden');
        } else {
            if (uploadContainer) uploadContainer.classList.add('hidden');
            if (uploadRangeError) uploadRangeError.classList.remove('hidden');
        }
        
        await loadStoriesList(zoneId);
        zoneStoriesModal.classList.remove('hidden');
    }

    async function loadStoriesList(zoneId) {
        const storiesList = document.getElementById('zone-stories-list');
        if (!storiesList) return;
        storiesList.innerHTML = '<div class="text-center text-xs text-outline py-8">Cargando historias...</div>';
        
        try {
            const res = await fetch(`${API_URL}/meetups/stories/${zoneId}`);
            const stories = await res.json();
            
            if (stories.length === 0) {
                storiesList.innerHTML = '<div class="text-center text-xs text-outline py-8">No hay historias en esta zona aún. ¡Transmite la primera!</div>';
            } else {
                storiesList.innerHTML = stories.map(s => {
                    const media = s.image ? `<div class="mt-2 rounded overflow-hidden border border-outline-variant/30 max-h-[160px] flex justify-center bg-black"><img src="${s.image}" class="max-h-[160px] w-auto object-contain"></div>` : '';
                    return `
                    <div class="p-3 rounded bg-surface-dim border border-outline-variant/20 flex gap-3 text-xs">
                        <div class="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-primary">
                            <img src="${s.avatar}" class="w-full h-full object-cover">
                        </div>
                        <div class="flex-grow min-w-0">
                            <div class="flex justify-between items-center mb-1 text-[10px]">
                                <span class="font-bold text-on-surface">@${s.username}</span>
                                <span class="text-outline font-status-code">${new Date(s.created_at).toLocaleTimeString()}</span>
                            </div>
                            <p class="text-on-surface-variant font-body-md">${s.content}</p>
                            ${media}
                        </div>
                    </div>
                    `;
                }).join('');
            }
        } catch (err) {
            console.error(err);
            storiesList.innerHTML = '<div class="text-center text-xs text-error py-8">Error al sintonizar historias.</div>';
        }
    }

    if (closeZoneStoriesBtn) {
        closeZoneStoriesBtn.addEventListener('click', () => {
            zoneStoriesModal.classList.add('hidden');
        });
    }

    if (formUploadStory) {
        formUploadStory.addEventListener('submit', async (e) => {
            e.preventDefault();
            const zoneId = document.getElementById('story-zone-id').value;
            const content = document.getElementById('story-content').value;
            const file = storyImage?.files[0];
            
            let myLat = null;
            let myLon = null;
            if (realUserCoords) {
                myLat = realUserCoords.lat;
                myLon = realUserCoords.lon;
            } else if (user.latitude && user.longitude) {
                myLat = user.latitude;
                myLon = user.longitude;
            }
            
            const formData = new FormData();
            formData.append('user_id', user.id);
            formData.append('zone_id', zoneId);
            formData.append('content', content);
            formData.append('user_lat', myLat);
            formData.append('user_lon', myLon);
            if (file) formData.append('image', file);
            
            try {
                const res = await fetch(`${API_URL}/meetups/stories`, {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();
                if (res.ok) {
                    showNotificationToast("HISTORIA EMITIDA", "Tu historia ha sido sintonizada en esta zona.", "photo_library");
                    document.getElementById('story-content').value = '';
                    if (storyImage) storyImage.value = '';
                    if (storyImageName) storyImageName.textContent = '';
                    await loadStoriesList(zoneId);
                    updateOperationsDashboard();
                } else {
                    showNotificationToast("ERROR DE RANGO", data.error, "warning");
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // --- ACTIVITY PIN / MEETUPS MODAL ---
    const createMeetupModal = document.getElementById('create-meetup-modal');
    const btnCreateMeetup = document.getElementById('btn-create-meetup');
    const closeCreateMeetupBtn = document.getElementById('close-create-meetup-modal');
    const formCreateMeetup = document.getElementById('form-create-meetup');
    
    if (btnCreateMeetup && createMeetupModal) {
        btnCreateMeetup.addEventListener('click', () => {
            let myLat = null;
            let myLon = null;
            if (realUserCoords) {
                myLat = parseFloat(realUserCoords.lat);
                myLon = parseFloat(realUserCoords.lon);
            } else if (user && user.latitude && user.longitude) {
                myLat = parseFloat(user.latitude);
                myLon = parseFloat(user.longitude);
            }
            
            if (myLat === null || myLon === null || isNaN(myLat) || isNaN(myLon)) {
                showNotificationToast("GPS REQUERIDO", "Debes activar tu señal GPS para iniciar un Meetup.", "warning");
                return;
            }
            
            document.getElementById('meetup-location-lbl').textContent = (user && user.location) ? user.location.toUpperCase() : 'DESCONOCIDO';
            document.getElementById('meetup-coords-lbl').textContent = `${myLat.toFixed(4)}, ${myLon.toFixed(4)}`;
            document.getElementById('meetup-description').value = '';
            createMeetupModal.classList.remove('hidden');
        });
    }

    if (closeCreateMeetupBtn && createMeetupModal) {
        closeCreateMeetupBtn.addEventListener('click', () => {
            createMeetupModal.classList.add('hidden');
        });
        document.getElementById('btn-cancel-meetup')?.addEventListener('click', () => {
            createMeetupModal.classList.add('hidden');
        });
    }

    if (formCreateMeetup) {
        formCreateMeetup.addEventListener('submit', async (e) => {
            e.preventDefault();
            const activity = document.getElementById('meetup-activity').value;
            const description = document.getElementById('meetup-description').value;
            
            let myLat = null;
            let myLon = null;
            if (realUserCoords) {
                myLat = parseFloat(realUserCoords.lat);
                myLon = parseFloat(realUserCoords.lon);
            } else if (user && user.latitude && user.longitude) {
                myLat = parseFloat(user.latitude);
                myLon = parseFloat(user.longitude);
            }
            
            if (myLat === null || myLon === null || isNaN(myLat) || isNaN(myLon)) {
                showNotificationToast("GPS REQUERIDO", "Debes activar tu señal GPS para iniciar un Meetup.", "warning");
                return;
            }
            
            try {
                const res = await fetch(`${API_URL}/meetups/pins`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        user_id: user.id,
                        activity: activity,
                        description: description,
                        latitude: myLat,
                        longitude: myLon,
                        location: user.location || 'Iribarren'
                    })
                });
                if (res.ok) {
                    showNotificationToast("RADAR ACTIVADO", `¡Tu pin de ${activity} ha sido encendido en el mapa!`, "add_location_alt");
                    createMeetupModal.classList.add('hidden');
                    updateOperationsDashboard();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // --- GPS SIMULATION TOOLS HANDLERS ---
    const btnToggleTester = document.getElementById('btn-toggle-tester');
    const testerPanel = document.getElementById('tester-panel');
    const testerToggleIcon = document.getElementById('tester-toggle-icon');
    
    if (btnToggleTester && testerPanel) {
        btnToggleTester.addEventListener('click', () => {
            testerPanel.classList.toggle('hidden');
            if (testerPanel.classList.contains('hidden')) {
                testerToggleIcon.textContent = 'expand_more';
            } else {
                testerToggleIcon.textContent = 'expand_less';
            }
        });
    }

    const gpsSimButtons = document.querySelectorAll('.btn-simulate-gps');
    gpsSimButtons.forEach(btn => {
        btn.addEventListener('click', async () => {
            const zoneKey = btn.dataset.zone;
            const zoneCoords = CONQUEST_ZONES_COORDS[zoneKey];
            if (zoneCoords) {
                localStorage.setItem('isGpsSimulated', 'true');
                realUserCoords = { lat: zoneCoords.lat, lon: zoneCoords.lon };
                gpsAccuracyMeters = 5; // High simulated GPS accuracy
                
                const gpsBadge = document.getElementById('gps-status-badge');
                if (gpsBadge) {
                    gpsBadge.textContent = `SIM: ${zoneKey.toUpperCase()}`;
                    gpsBadge.className = "font-status-code text-[8px] text-secondary animate-pulse";
                }
                
                showNotificationToast("GPS SIMULADO", `Señal re-enrutada a: ${zoneCoords.name}`, "location_on");
                
                try {
                    await fetch(`${API_URL}/users/${user.id}/coordinates`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            latitude: realUserCoords.lat,
                            longitude: realUserCoords.lon
                        })
                    });
                } catch(e) {}
                
                updateOperationsDashboard();
                loadFeed();
            }
        });
    });

    const btnResetGps = document.getElementById('btn-reset-gps');
    if (btnResetGps) {
        btnResetGps.addEventListener('click', () => {
            localStorage.removeItem('isGpsSimulated');
            realUserCoords = null;
            gpsAccuracyMeters = null;
            
            const gpsBadge = document.getElementById('gps-status-badge');
            if (gpsBadge) {
                gpsBadge.textContent = "GPS: SYNCED";
                gpsBadge.className = "font-status-code text-[8px] text-primary";
            }
            
            showNotificationToast("GPS RESTAURADO", "Buscando coordenadas reales de hardware...", "location_on");
            requestUserGeolocation();
            
            setTimeout(() => {
                updateOperationsDashboard();
                loadFeed();
            }, 800);
        });
    }

    // Init and set interval
    setTimeout(() => {
        updateOperationsDashboard();
        setInterval(updateOperationsDashboard, 5000);
    }, 100);



    // --- THREADS & SYNTHESIS MODAL (NESTED COMMENTS) ---
    const threadModal = document.getElementById('thread-modal');
    const closeThreadModalBtn = document.getElementById('close-thread-modal');
    const threadCommentsList = document.getElementById('thread-comments-list');
    const threadCommentInput = document.getElementById('thread-comment-input');
    const threadCommentParentId = document.getElementById('thread-comment-parent-id');
    const btnSendThreadComment = document.getElementById('btn-send-thread-comment');
    const threadReplyIndicator = document.getElementById('thread-reply-indicator');
    const threadReplyUsername = document.getElementById('thread-reply-username');
    const btnCancelReply = document.getElementById('btn-cancel-reply');

    let currentOpenPostId = null;
    let currentOpenPost = null;

    async function openThreadModal(postId) {
        if (!threadModal) return;
        
        const isNewOpen = lastOpenedPostId !== postId;
        lastOpenedPostId = postId;
        currentOpenPostId = postId;
        
        try {
            const resPost = await fetch(`${API_URL}/posts?user_id=${user.id}`);
            const posts = await resPost.json();
            const p = posts.find(item => item.id == postId);
            if (!p) return;

            currentOpenPost = p;

            // Trigger EM glitch overlay & sound on network outage posts
            if (!p.has_power) {
                triggerGlitchEffect();
            }

            const leftCanvas = document.getElementById('thread-left-canvas');
            const rightComments = document.getElementById('thread-right-comments');
            const modalContainer = document.getElementById('thread-modal-container');

            if (p.image) {
                if (leftCanvas) leftCanvas.classList.remove('hidden');
                if (rightComments) {
                    rightComments.classList.remove('md:w-full');
                    rightComments.classList.add('md:w-1/2');
                }
                if (modalContainer) {
                    modalContainer.classList.remove('max-w-2xl');
                    modalContainer.classList.add('max-w-7xl');
                }
                
                const postImg = document.getElementById('thread-post-image');
                const noImgPlaceholder = document.getElementById('thread-post-no-image-placeholder');
                if (postImg && noImgPlaceholder) {
                    postImg.src = p.image;
                    postImg.classList.remove('hidden');
                    noImgPlaceholder.classList.add('hidden');
                }
            } else {
                if (leftCanvas) leftCanvas.classList.add('hidden');
                if (rightComments) {
                    rightComments.classList.remove('md:w-1/2');
                    rightComments.classList.add('md:w-full');
                }
                if (modalContainer) {
                    modalContainer.classList.remove('max-w-7xl');
                    modalContainer.classList.add('max-w-2xl');
                }
            }

            document.getElementById('thread-post-location').textContent = `${p.location} - ${p.has_power ? 'Estable' : 'Corte'}`;
            const badge = document.getElementById('thread-post-badge');
            const badgeDot = document.getElementById('thread-post-badge-dot');
            if (p.has_power) {
                badge.className = "flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded-sm backdrop-blur-md";
                badgeDot.className = "w-2 h-2 rounded-full bg-primary pulse-breathe shadow-[0_0_8px_rgba(0,242,255,0.8)]";
            } else {
                badge.className = "flex items-center gap-2 bg-error-container/20 border border-error/30 px-3 py-1.5 rounded-sm backdrop-blur-md";
                badgeDot.className = "w-2 h-2 rounded-full bg-error status-strobe shadow-[0_0_8px_rgba(255,180,171,0.8)]";
            }
            
            document.getElementById('thread-post-time').textContent = new Date(p.created_at).toLocaleTimeString();

            document.getElementById('thread-post-author-avatar').src = p.avatar;
            document.getElementById('thread-post-author-name').textContent = `@${p.username}`;
            document.getElementById('thread-post-author-username').textContent = `NODO: ${p.name.toUpperCase()}`;
            
            const contentEl = document.getElementById('thread-post-content');
            if (contentEl) {
                if (isNewOpen) {
                    decryptText(contentEl, p.content);
                } else {
                    contentEl.textContent = p.content;
                }
            }

            await loadThreadComments(isNewOpen);
            clearReplyState();

            threadModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');

        } catch (err) {
            console.error(err);
        }
    }

    async function loadThreadComments(isNewOpen = false) {
        if (!currentOpenPostId || !threadCommentsList) return;

        try {
            const res = await fetch(`${API_URL}/posts/${currentOpenPostId}/comments`);
            const comments = await res.json();
            
            document.getElementById('thread-comments-count').textContent = `${comments.length} NODOS ACTIVOS`;
            threadCommentsList.innerHTML = '';

            let htmlContent = '';

            // Renderizar la tarjeta Root Post al principio si el post no tiene imagen
            if (currentOpenPost && !currentOpenPost.image) {
                const borderClass = currentOpenPost.has_power ? 'border-primary/30 bg-primary/5' : 'border-error/30 bg-error/5';
                const statusDotClass = currentOpenPost.has_power ? 'bg-primary shadow-[0_0_8px_#00f2ff]' : 'bg-error shadow-[0_0_8px_#ffb4ab] pulse-strobe';
                
                htmlContent += `
                <div class="p-4 rounded border ${borderClass} mb-6 relative overflow-hidden">
                    <div class="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTEgMWgyMHYyMEgxVjF6IiBmaWxsPSJub25lIiBzdHJva2U9InJnYmEoNTgsIDczLCA3NSwgMC4xKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9zdmc+')] opacity-40 pointer-events-none"></div>
                    <div class="flex items-center justify-between border-b border-outline-variant/30 pb-2 mb-3 relative z-10">
                        <div class="flex items-center gap-3">
                            <img src="${currentOpenPost.avatar}" class="w-8 h-8 rounded-full border border-primary object-cover">
                            <div>
                                <span class="font-status-code text-xs text-on-surface">@${currentOpenPost.username} <span class="text-[9px] text-outline font-normal">(${currentOpenPost.name})</span></span>
                                <span class="block font-label-caps text-[9px] text-outline flex items-center gap-0.5 mt-0.5">
                                    <span class="material-symbols-outlined text-[10px]">location_on</span> ${currentOpenPost.location.toUpperCase()}
                                </span>
                            </div>
                        </div>
                        <div class="flex items-center gap-2 bg-background/50 border border-outline-variant/30 px-2 py-0.5 rounded text-[9px] font-label-caps text-on-surface-variant">
                            <span class="w-1.5 h-1.5 rounded-full ${statusDotClass}"></span>
                            <span>${currentOpenPost.has_power ? 'ESTABLE' : 'CORTE'}</span>
                        </div>
                    </div>
                    <p class="text-on-surface font-body-md text-sm relative z-10">${currentOpenPost.content}</p>
                    <div class="text-[9px] text-outline font-label-caps mt-3 text-right relative z-10">${new Date(currentOpenPost.created_at).toLocaleString()}</div>
                </div>
                `;
            }

            if (comments.length === 0) {
                if (currentOpenPost && !currentOpenPost.image) {
                    threadCommentsList.innerHTML = htmlContent;
                } else {
                    threadCommentsList.innerHTML = `
                    <div class="text-center py-12 text-outline text-xs font-label-caps">
                        <span class="material-symbols-outlined text-[24px] mb-1 animate-pulse">forum</span>
                        <p>SIN HILOS DE SÍNTESIS EN EL MOMENTO</p>
                    </div>`;
                }
                return;
            }

            const roots = comments.filter(c => !c.parent_id);
            const childrenMap = {};
            comments.forEach(c => {
                if (c.parent_id) {
                    if (!childrenMap[c.parent_id]) childrenMap[c.parent_id] = [];
                    childrenMap[c.parent_id].push(c);
                }
            });

            roots.forEach(root => {
                htmlContent += buildCommentTreeHTML(root, childrenMap, 0);
            });

            threadCommentsList.innerHTML = htmlContent;

            if (isNewOpen) {
                const commentTexts = document.querySelectorAll('.thread-group .text-on-surface-variant');
                commentTexts.forEach((el, idx) => {
                    if (idx < 5) {
                        decryptText(el, el.textContent);
                    }
                });
            }

            document.querySelectorAll('.btn-comment-reply').forEach(btn => {
                btn.addEventListener('click', () => {
                    const commentId = btn.dataset.commentId;
                    const authorTag = btn.dataset.authorUsername;
                    
                    threadCommentParentId.value = commentId;
                    threadReplyUsername.textContent = `@${authorTag}`;
                    threadReplyIndicator.classList.remove('hidden');
                    threadCommentInput.focus();
                });
            });

        } catch (err) {
            console.error(err);
        }
    }

    function buildCommentTreeHTML(comment, childrenMap, depth) {
        const children = childrenMap[comment.id] || [];
        const isLastLevel = depth >= 2;
        
        let indentClass = '';
        if (depth === 1) indentClass = 'ml-thread-indent';
        if (depth >= 2) indentClass = 'ml-[48px]';

        const avatarSize = depth === 0 ? 'w-10 h-10' : (depth === 1 ? 'w-8 h-8' : 'w-6 h-6');
        const connectorHTML = children.length > 0 && !isLastLevel ? '<div class="thread-line"></div>' : '';
        const nameColor = depth === 0 ? 'text-on-surface' : (depth === 1 ? 'text-secondary' : 'text-error');

        let commentHTML = `
        <div class="thread-group relative ${indentClass} mb-4">
            ${connectorHTML}
            <div class="flex gap-3 relative z-10">
                <img alt="${comment.name}" class="${avatarSize} rounded-sm border border-outline-variant bg-surface-dim z-10 shrink-0 object-cover" src="${comment.avatar}"/>
                <div class="flex-grow">
                    <div class="flex justify-between items-baseline mb-1">
                        <span class="font-label-caps text-xs ${nameColor}">@${comment.username} <span class="text-[9px] text-outline font-normal">(${comment.name})</span></span>
                        <span class="font-status-code text-[9px] text-outline">${new Date(comment.created_at).toLocaleTimeString()}</span>
                    </div>
                    <p class="text-on-surface-variant text-sm font-body-md">${comment.content}</p>
                    <div class="flex gap-4 items-center mt-1">
                        <button class="font-label-caps text-[9px] text-primary hover:text-primary-fixed-dim transition-colors flex items-center gap-1 group btn-comment-reply" data-comment-id="${comment.id}" data-author-username="${comment.username}">
                            <span class="material-symbols-outlined text-[12px] group-hover:-translate-y-0.5 transition-transform">reply</span> RESPONDER
                        </button>
                    </div>
                </div>
            </div>
        `;

        if (children.length > 0) {
            children.forEach(child => {
                commentHTML += buildCommentTreeHTML(child, childrenMap, depth + 1);
            });
        }

        commentHTML += `</div>`;
        return commentHTML;
    }

    function clearReplyState() {
        if (threadCommentParentId) threadCommentParentId.value = '';
        if (threadReplyIndicator) threadReplyIndicator.classList.add('hidden');
        if (threadCommentInput) threadCommentInput.value = '';
    }

    if (closeThreadModalBtn) {
        closeThreadModalBtn.addEventListener('click', () => {
            threadModal.classList.add('hidden');
            document.body.classList.remove('overflow-hidden');
            currentOpenPostId = null;
            loadFeed();
        });
    }

    if (btnCancelReply) {
        btnCancelReply.addEventListener('click', clearReplyState);
    }

    if (btnSendThreadComment) {
        btnSendThreadComment.addEventListener('click', async () => {
            const content = threadCommentInput.value;
            const parentId = threadCommentParentId.value;
            
            if (!content.trim() || !currentOpenPostId) return;

            try {
                const res = await fetch(`${API_URL}/posts/${currentOpenPostId}/comment`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        user_id: user.id,
                        content: content,
                        parent_id: parentId ? parseInt(parentId) : null
                    })
                });

                if (res.ok) {
                    clearReplyState();
                    if (window.soundEffects) window.soundEffects.playComment();
                    await loadThreadComments();
                }
            } catch (err) {
                console.error(err);
            }
        });
    }

    // --- NODES (CHAT) ---
    const nodesList = document.getElementById('nodes-list');
    const chatWindow = document.getElementById('chat-window');
    const chatMessages = document.getElementById('chat-messages');
    const chatTitle = document.getElementById('chat-title');
    const btnSendMsg = document.getElementById('btn-send-msg');
    const msgInput = document.getElementById('chat-input');
    let activeChatUser = null;
    let chatInterval = null;

    if (nodesList) {
        async function loadNodes() {
            try {
                const res = await fetch(`${API_URL}/users`);
                const users = await res.json();
                nodesList.innerHTML = '';

                function getUserCoordinates(uId, uLocation, uLatitude, uLongitude) {
                    let lat = uLatitude;
                    let lon = uLongitude;
                    const loc = (uLocation && uLocation !== 'Anónimo') ? uLocation : 'Iribarren';
                    const meta = MUNICIPALITY_METADATA[loc];
                    const coords = parseCoords(meta?.coords);
                    if (coords) {
                        if (lat === null || lon === null || (Math.abs(lat - coords.lat) < 0.0001 && Math.abs(lon - coords.lon) < 0.0001)) {
                            const offsetLat = ((uId * 17) % 100 - 50) * 0.0005;
                            const offsetLon = ((uId * 23) % 100 - 50) * 0.0005;
                            lat = coords.lat + offsetLat;
                            lon = coords.lon + offsetLon;
                        }
                    }
                    return { lat, lon };
                }

                let myLat = null;
                let myLon = null;
                if (realUserCoords) {
                    myLat = realUserCoords.lat;
                    myLon = realUserCoords.lon;
                } else {
                    const myCoords = getUserCoordinates(user.id, user.location, user.latitude, user.longitude);
                    myLat = myCoords.lat;
                    myLon = myCoords.lon;
                }

                const processedNodes = [];
                users.forEach(u => {
                    if (u.id === user.id) return;
                    
                    const uCoords = getUserCoordinates(u.id, u.location, u.latitude, u.longitude);
                    let dist = 0;
                    if (myLat !== null && myLon !== null && uCoords.lat !== null && uCoords.lon !== null) {
                        dist = getHaversineDistance(myLat, myLon, uCoords.lat, uCoords.lon);
                    } else {
                        dist = ((u.id * 7) % 49) + 1;
                    }
                    dist = Math.round(dist * 10) / 10;
                    processedNodes.push({ user: u, dist });
                });

                // Sort by distance (closest first)
                processedNodes.sort((a, b) => a.dist - b.dist);

                processedNodes.forEach(({ user: u, dist }) => {
                    const statusDot = u.is_online 
                        ? `<span class="flex items-center gap-1 text-[9px] font-status-code text-primary"><span class="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#00f2ff] pulse-breathe"></span> EN LÍNEA</span>` 
                        : `<span class="flex items-center gap-1 text-[9px] font-status-code text-outline"><span class="w-1.5 h-1.5 rounded-full bg-outline-variant"></span> DESCONECTADO</span>`;
                    
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 rounded bg-surface hover:bg-surface-variant/50 transition-colors border border-transparent hover:border-primary/30 cursor-pointer";
                    li.innerHTML = `
                        <div class="flex items-center gap-3">
                            <img src="${u.avatar}" class="w-8 h-8 rounded-full border border-primary object-cover">
                            <div>
                                <span class="font-status-code text-sm text-on-surface">${u.name} <span class="text-outline text-xs">(${dist} KM)</span></span>
                                <span class="block text-[10px] text-outline flex items-center gap-2">${u.location} &bull; ${statusDot}</span>
                            </div>
                        </div>
                        <button class="bg-primary/20 text-primary px-3 py-1 rounded text-xs hover:bg-primary hover:text-on-primary btn-open-chat" data-id="${u.id}" data-name="${u.name}">MENSAJE</button>
                    `;
                    nodesList.appendChild(li);
                });



                document.querySelectorAll('.btn-open-chat').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const targetUser = btn.dataset.id;
                        activeChatUser = targetUser;
                        chatTitle.textContent = `CHAT CON ${btn.dataset.name}`;
                        chatWindow.classList.remove('hidden');
                        
                        // Mobile List/Detail Switcher
                        const nodesAside = document.getElementById('nodes-list-aside');
                        const chatSection = document.getElementById('chat-window-section');
                        if (nodesAside) nodesAside.classList.add('mobile-hidden');
                        if (chatSection) chatSection.classList.add('mobile-visible');

                        // Clear animated message IDs so they decrypt on open
                        animatedMessageIds.clear();

                        loadMessages();
                        if (chatInterval) clearInterval(chatInterval);
                        chatInterval = setInterval(loadMessages, 2000);
                    });
                });
                
                // Automatically open chat from story/radar URL search params
                const urlParams = new URLSearchParams(window.location.search);
                const chatUserId = urlParams.get('chat_user');
                if (chatUserId) {
                    const targetBtn = document.querySelector(`.btn-open-chat[data-id="${chatUserId}"]`);
                    if (targetBtn) {
                        targetBtn.click();
                    }
                }
            } catch(e) { console.error(e); }
        }

        async function loadMessages() {
            if (!activeChatUser) return;
            try {
                const res = await fetch(`${API_URL}/messages/${user.id}/${activeChatUser}`);
                const msgs = await res.json();
                chatMessages.innerHTML = '';
                
                msgs.forEach(m => {
                    const isMe = m.from_user_id === user.id;
                    const isNew = !animatedMessageIds.has(m.id);
                    animatedMessageIds.add(m.id);
                    
                    const div = document.createElement('div');
                    div.className = `flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} mb-2`;
                    
                    let messageContentHTML = '';
                    let dataAttrs = '';
                    
                    if (m.burn_time !== null) {
                        const openedTime = m.opened_at ? new Date(m.opened_at.replace(' ', 'T') + 'Z').getTime() : Date.now();
                        const elapsed = m.opened_at ? Math.floor((Date.now() - openedTime) / 1000) : 0;
                        const totalBurnTime = m.burn_time === -1 ? 15 : m.burn_time;
                        const timeLeft = totalBurnTime - elapsed;
                        
                        if (m.opened_at && timeLeft <= 0) {
                            return; // Already expired, skip rendering
                        }
                        
                        dataAttrs = `data-msg-id="${m.id}" data-burn-time="${m.burn_time}" data-opened-at="${m.opened_at || ''}"`;
                        const isOpened = m.opened_at !== null;
                        const label = m.burn_time === -1 ? 'LECTURA ÚNICA' : `AUTODESTRUCCIÓN EN <span class="burn-timer-val">${isOpened ? timeLeft : m.burn_time}</span>s`;
                        
                        messageContentHTML = `
                            <div class="burn-note relative p-2.5 rounded-lg text-sm bg-error/15 border border-error/40 text-on-surface-variant flex flex-col gap-1" ${dataAttrs}>
                                <span class="chat-message-text font-mono">${m.content}</span>
                                <span class="burn-timer-label text-[9px] text-error font-status-code flex items-center gap-1 mt-1 font-bold">
                                    <span class="material-symbols-outlined text-[10px] animate-pulse">local_fire_department</span>
                                    ${isOpened ? `🔥 ${label}` : `🔥 CREADO (ESPERANDO LECTURA)`}
                                </span>
                            </div>
                        `;
                    } else {
                        messageContentHTML = `
                            <div class="chat-normal-text ${isMe ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface'} p-2 rounded-lg text-sm">
                                ${m.content}
                            </div>
                        `;
                    }
                    
                    div.innerHTML = `
                        ${messageContentHTML}
                        <span class="text-[8px] text-outline mt-1">${new Date(m.created_at).toLocaleTimeString()}</span>
                    `;
                    chatMessages.appendChild(div);
                    
                    if (isNew) {
                        const textNode = div.querySelector('.chat-message-text, .chat-normal-text');
                        if (textNode) {
                            decryptText(textNode, m.content);
                        }
                    }
                });

                // Consultar telemetría de escritura (typing indicator)
                try {
                    const typingRes = await fetch(`${API_URL}/chat/typing/${user.id}`);
                    const typers = await typingRes.json();
                    const isTyping = typers.includes(parseInt(activeChatUser));
                    
                    let indicator = document.getElementById('chat-typing-indicator');
                    if (isTyping) {
                        if (!indicator) {
                            indicator = document.createElement('div');
                            indicator.id = 'chat-typing-indicator';
                            indicator.className = 'flex items-center gap-2 text-primary font-status-code text-[10px] p-2 mb-2 self-start bg-surface-variant/20 rounded border border-primary/20 animate-pulse shrink-0';
                            indicator.innerHTML = `
                                <span class="material-symbols-outlined text-xs">sensors</span>
                                <span>TRANSMITIENDO SEÑAL</span>
                                <div class="typing-dots flex items-center ml-1"><span></span><span></span><span></span></div>
                            `;
                            chatMessages.appendChild(indicator);
                        }
                    } else {
                        if (indicator) {
                            indicator.remove();
                        }
                    }
                } catch(te) {}

                chatMessages.scrollTop = chatMessages.scrollHeight;
            } catch(e) { console.error(e); }
        }

        btnSendMsg.addEventListener('click', async () => {
            const text = msgInput.value;
            if (!text.trim() || !activeChatUser) return;
            
            // Informar que terminamos de escribir inmediatamente
            fetch(`${API_URL}/chat/typing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, typing_to_id: activeChatUser, is_typing: false })
            }).catch(() => {});

            const burnTimeSelect = document.getElementById('chat-burn-time');
            const burnTime = burnTimeSelect ? burnTimeSelect.value : '';

            await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    from_user_id: user.id,
                    to_user_id: activeChatUser,
                    content: text,
                    burn_time: burnTime ? parseInt(burnTime) : null
                })
            });
            
            if (window.soundEffects) window.soundEffects.playMessageSent();
            msgInput.value = '';
            if (burnTimeSelect) burnTimeSelect.value = '';
            loadMessages();
        });

        // Enviar evento de escritura al teclear
        let lastTypingSent = 0;
        msgInput.addEventListener('input', () => {
            const now = Date.now();
            if (now - lastTypingSent > 2000 && activeChatUser) {
                lastTypingSent = now;
                fetch(`${API_URL}/chat/typing`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: user.id, typing_to_id: activeChatUser, is_typing: true })
                }).catch(() => {});
            }
        });

        loadNodes();
    }

    function initMobileNavigation() {
        const columns = ['column-map', 'column-feed', 'column-radar'];
        
        function setActiveTab(targetId) {
            if (!columns.includes(targetId)) return;
            
            // Update columns visibility on mobile
            columns.forEach(colId => {
                const el = document.getElementById(colId);
                if (el) {
                    if (colId === targetId) {
                        el.classList.add('mobile-active');
                    } else {
                        el.classList.remove('mobile-active');
                    }
                }
            });
            
            // Update bottom navigation bar button states
            document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
                if (btn.dataset.target === targetId) {
                    btn.classList.add('active', 'text-primary');
                    btn.classList.remove('text-outline');
                } else if (btn.dataset.target) {
                    btn.classList.remove('active', 'text-primary');
                    btn.classList.add('text-outline');
                }
            });
            
            // Update top navbar links active state
            const navMap = document.getElementById('nav-map');
            const navFeed = document.getElementById('nav-feed');
            const navRadar = document.getElementById('nav-radar');
            
            const navLinks = {
                'column-map': navMap,
                'column-feed': navFeed,
                'column-radar': navRadar
            };
            
            Object.entries(navLinks).forEach(([colId, link]) => {
                if (link) {
                    if (colId === targetId) {
                        link.className = "text-primary font-bold border-b-2 border-primary pb-1 flex flex-col justify-center h-full mt-1 text-sm md:text-base shrink-0";
                    } else {
                        link.className = "text-on-surface-variant font-medium hover:text-primary-fixed-dim transition-colors duration-300 flex flex-col justify-center h-full text-sm md:text-base shrink-0";
                    }
                }
            });
        }
        
        // Default tab
        let defaultTab = 'column-feed';
        
        // Check hash on load
        const hash = window.location.hash.replace('#', '');
        if (columns.includes(hash)) {
            defaultTab = hash;
        }
        
        setActiveTab(defaultTab);
        
        // Add event listeners to bottom nav buttons
        document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = btn.dataset.target;
                if (target) {
                    e.preventDefault();
                    setActiveTab(target);
                    window.location.hash = target;
                    if (window.soundEffects) window.soundEffects.playClick();
                }
            });
        });
        
        // Intercept top navigation clicks
        ['nav-map', 'nav-feed', 'nav-radar'].forEach(navId => {
            const link = document.getElementById(navId);
            if (link) {
                link.addEventListener('click', (e) => {
                    const href = link.getAttribute('href');
                    if (href && href.startsWith('#')) {
                        const targetId = href.substring(1);
                        if (columns.includes(targetId)) {
                            if (window.innerWidth < 768) {
                                e.preventDefault();
                                setActiveTab(targetId);
                                window.location.hash = targetId;
                            }
                        }
                    }
                });
            }
        });
        
        // Listen for hash changes
        window.addEventListener('hashchange', () => {
            const newHash = window.location.hash.replace('#', '');
            if (columns.includes(newHash)) {
                setActiveTab(newHash);
            }
        });
    }

    // --- INITIALIZATION WIRING ---
    if (feedContainer) {
        initMobileNavigation();
        loadFeed();
        loadStories();

        const urlParams = new URLSearchParams(window.location.search);
        const openPostId = urlParams.get('open_post');
        if (openPostId) {
            setTimeout(() => {
                openThreadModal(openPostId);
            }, 500);
        }
    }

    if (nodesList) {
        const btnBackToNodes = document.getElementById('btn-back-to-nodes');
        if (btnBackToNodes) {
            btnBackToNodes.addEventListener('click', () => {
                const nodesAside = document.getElementById('nodes-list-aside');
                const chatSection = document.getElementById('chat-window-section');
                if (nodesAside) nodesAside.classList.remove('mobile-hidden');
                if (chatSection) chatSection.classList.remove('mobile-visible');
                
                // Clear active chat to stop interval
                activeChatUser = null;
                if (chatInterval) {
                    clearInterval(chatInterval);
                    chatInterval = null;
                }
                if (window.soundEffects) window.soundEffects.playClick();
            });
        }
    }
});
