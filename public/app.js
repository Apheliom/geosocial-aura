const API_URL = '/api';

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
            const location = document.getElementById('reg-location').value;
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
        nameTags.forEach(el => el.textContent = user.name);
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

    // --- SETTINGS MODAL ---
    const btnSettings = document.getElementById('btn-settings');
    const btnAvatarSettings = document.getElementById('btn-avatar-settings');
    const settingsModal = document.getElementById('settings-modal');
    if (settingsModal && user) {
        const triggers = [btnSettings, btnAvatarSettings].filter(Boolean);
        triggers.forEach(t => t.addEventListener('click', () => {
            document.getElementById('settings-name').value = user.name;
            document.getElementById('settings-location').value = user.location;
            document.getElementById('settings-avatar-preview').src = user.avatar;
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
            const file = document.getElementById('settings-avatar-input').files[0];
            
            const formData = new FormData();
            formData.append('name', name);
            formData.append('location', location);
            if (file) formData.append('avatar', file);

            const res = await fetch(`${API_URL}/users/${user.id}/update`, {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            if (res.ok) {
                user.name = data.name;
                user.location = data.location;
                if (data.avatar) user.avatar = data.avatar;
                sessionStorage.setItem('currentUser', JSON.stringify(user));
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
                        return `<li class="p-3 border-b border-outline-variant/30 text-xs ${!n.is_read ? 'bg-primary/10' : ''}">${text}</li>`;
                    }).join('');
                }
            } catch(e) {}
        }
        
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
            e.preventDefault();
            highlightColumn('column-map');
        });
    }
    if (navFeed) {
        navFeed.addEventListener('click', (e) => {
            e.preventDefault();
            highlightColumn('column-feed');
        });
    }
    if (navRadar) {
        navRadar.addEventListener('click', (e) => {
            e.preventDefault();
            highlightColumn('column-radar');
        });
    }

    // --- STAGE SELECTION BY MAP POLYGON CLICK ---
    let currentFilterMunicipality = null;

    // --- FEED LOGIC ---
    const feedContainer = document.getElementById('feed-container');

    async function loadFeed() {
        if (!feedContainer || !user) return;
        try {
            const res = await fetch(`${API_URL}/posts?user_id=${user.id}`);
            let posts = await res.json();
            
            // Filter by municipality if one is selected
            if (currentFilterMunicipality) {
                posts = posts.filter(p => p.location.toLowerCase() === currentFilterMunicipality.toLowerCase());
            }

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
                article.className = "bg-surface-container-low/90 backdrop-blur-md rounded-lg border border-outline-variant overflow-hidden mb-6 glow-accent-hover transition-all duration-300";
                
                const mediaHTML = p.image ? `
                <div class="w-full aspect-video bg-surface-dim relative border-y border-outline-variant/30 overflow-hidden cursor-pointer btn-open-thread" data-id="${p.id}">
                    <img src="${p.image}" class="w-full h-full object-cover opacity-85 hover:opacity-100 transition-opacity duration-300">
                </div>` : '';

                const statusIndicatorClass = p.has_power ? "bg-primary shadow-[0_0_8px_#00f2ff] pulse-breathe" : "bg-error shadow-[0_0_8px_#ffb4ab] pulse-strobe";

                const sharedHTML = p.original_post_id ? `
                <div class="mx-3 mt-3 p-3 border border-outline-variant/50 rounded bg-surface-dim/50 italic text-xs text-on-surface-variant">
                    <span class="text-[9px] font-label-caps text-outline mb-1 block">RETRANSMISIÓN DE NODO: ${p.original_author ? p.original_author.toUpperCase() : 'DESCONOCIDO'}</span>
                    "${p.original_content}"
                </div>
                ` : '';

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
                    </div>
                </div>
                ${sharedHTML}
                ${mediaHTML}
                <div class="p-3 flex flex-col gap-2">
                    <p class="font-body-md text-sm text-on-surface-variant cursor-pointer btn-open-thread" data-id="${p.id}">${p.content}</p>
                    <div class="flex justify-between items-center text-outline mt-2 pt-2 border-t border-outline-variant/30">
                        <div class="flex gap-4">
                            <button class="hover:text-primary transition-colors flex items-center gap-1 btn-like" data-id="${p.id}">
                                <span class="material-symbols-outlined text-[18px] ${p.user_liked ? 'text-primary' : ''}">favorite</span>
                                <span class="text-xs font-status-code">${p.like_count}</span>
                            </button>
                            <button class="hover:text-primary transition-colors flex items-center gap-1 btn-open-thread" data-id="${p.id}">
                                <span class="material-symbols-outlined text-[18px]">chat_bubble</span>
                                <span class="text-xs font-status-code">${p.comment_count}</span>
                            </button>
                            <button class="hover:text-primary transition-colors flex items-center gap-1 btn-share" data-id="${p.id}" data-content="${p.content}" data-author="${p.name}">
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
                loadFeed();
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
    }

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

            try {
                const res = await fetch(`${API_URL}/posts`, {
                    method: 'POST',
                    body: formData
                });
                if (res.ok) {
                    document.getElementById('post-text').value = '';
                    if (imageInput) imageInput.value = '';
                    if (imageName) imageName.textContent = '';
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

        } catch (err) {
            console.error(err);
        }
    }
    
    // Map setup on DOM
    const mapPolygons = document.querySelectorAll('#vector-map polygon');
    if (mapPolygons.length > 0) {
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
                const withP = polygon.dataset.statsWith || 0;
                const noP = polygon.dataset.statsNo || 0;
                
                tooltip.innerHTML = `
                    <h4 class="font-bold text-primary mb-1">${municipality.toUpperCase()}</h4>
                    <div class="flex gap-2"><span class="text-primary">ESTABLE:</span> <span>${withP} nodos</span></div>
                    <div class="flex gap-2"><span class="text-error">CORTE:</span> <span>${noP} nodos</span></div>
                `;
                
                tooltip.classList.remove('hidden');
                tooltip.style.left = (e.clientX + 15) + 'px';
                tooltip.style.top = (e.clientY + 15) + 'px';
            });

            polygon.addEventListener('mouseleave', () => {
                tooltip.classList.add('hidden');
            });

            // Clicking polygon filters feed by that municipality
            polygon.addEventListener('click', () => {
                mapPolygons.forEach(p => p.classList.remove('stroke-primary', 'stroke-[1.5]'));
                
                if (currentFilterMunicipality === municipality) {
                    currentFilterMunicipality = null;
                } else {
                    currentFilterMunicipality = municipality;
                    polygon.classList.add('stroke-primary', 'stroke-[1.5]');
                }
                loadFeed();
            });
        });
    }

    // --- PROXIMITY RADAR ---
    const radarContainer = document.getElementById('radar-users');
    const radarSlider = document.getElementById('radar-slider');
    const radarValue = document.getElementById('radar-value');
    
    async function updateRadar() {
        if (!radarContainer || !radarSlider || !user) return;
        const val = radarSlider.value;
        radarValue.textContent = val + ' KM';
        
        try {
            const res = await fetch(`${API_URL}/users`);
            const users = await res.json();
            radarContainer.innerHTML = '';
            
            users.forEach(u => {
                if (u.id === user.id) return;
                const fakeDistance = ((u.id * 7) % 49) + 1;
                if (fakeDistance <= val) {
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-2 rounded bg-surface hover:bg-surface-variant/40 transition-colors border border-transparent hover:border-primary/30 cursor-pointer btn-radar-node";
                    li.dataset.id = u.id;
                    li.innerHTML = `
                        <div class="flex items-center gap-2">
                            <div class="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_5px_#00f2ff] pulse-breathe"></div>
                            <span class="font-status-code text-xs text-on-surface">${u.username}</span>
                        </div>
                        <span class="font-label-caps text-[10px] text-outline">${fakeDistance} KM</span>
                    `;
                    radarContainer.appendChild(li);
                }
            });

            document.querySelectorAll('.btn-radar-node').forEach(node => {
                node.addEventListener('click', () => {
                    window.location.href = `/nodes?chat_user=${node.dataset.id}`;
                });
            });

        } catch(e) { console.error(e); }
    }

    if (radarSlider) {
        radarSlider.addEventListener('input', updateRadar);
        updateRadar();
    }


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

    async function openThreadModal(postId) {
        if (!threadModal) return;
        currentOpenPostId = postId;
        
        try {
            const resPost = await fetch(`${API_URL}/posts?user_id=${user.id}`);
            const posts = await resPost.json();
            const p = posts.find(item => item.id == postId);
            if (!p) return;

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
            
            const postImg = document.getElementById('thread-post-image');
            const noImgPlaceholder = document.getElementById('thread-post-no-image-placeholder');
            if (p.image) {
                postImg.src = p.image;
                postImg.classList.remove('hidden');
                noImgPlaceholder.classList.add('hidden');
            } else {
                postImg.classList.add('hidden');
                noImgPlaceholder.classList.remove('hidden');
            }

            document.getElementById('thread-post-author-avatar').src = p.avatar;
            document.getElementById('thread-post-author-name').textContent = `@${p.username}`;
            document.getElementById('thread-post-author-username').textContent = `NODO: ${p.name.toUpperCase()}`;
            document.getElementById('thread-post-content').textContent = p.content;

            await loadThreadComments();
            clearReplyState();

            threadModal.classList.remove('hidden');
            document.body.classList.add('overflow-hidden');

        } catch (err) {
            console.error(err);
        }
    }

    async function loadThreadComments() {
        if (!currentOpenPostId || !threadCommentsList) return;

        try {
            const res = await fetch(`${API_URL}/posts/${currentOpenPostId}/comments`);
            const comments = await res.json();
            
            document.getElementById('thread-comments-count').textContent = `${comments.length} NODOS ACTIVOS`;
            threadCommentsList.innerHTML = '';

            if (comments.length === 0) {
                threadCommentsList.innerHTML = `
                <div class="text-center py-12 text-outline text-xs font-label-caps">
                    <span class="material-symbols-outlined text-[24px] mb-1 animate-pulse">forum</span>
                    <p>SIN HILOS DE SÍNTESIS EN EL MOMENTO</p>
                </div>`;
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

            let htmlContent = '';
            roots.forEach(root => {
                htmlContent += buildCommentTreeHTML(root, childrenMap, 0);
            });

            threadCommentsList.innerHTML = htmlContent;

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
                users.forEach(u => {
                    if (u.id === user.id) return;
                    const li = document.createElement('li');
                    li.className = "flex justify-between items-center p-3 rounded bg-surface hover:bg-surface-variant/50 transition-colors border border-transparent hover:border-primary/30 cursor-pointer";
                    li.innerHTML = `
                        <div class="flex items-center gap-3">
                            <img src="${u.avatar}" class="w-8 h-8 rounded-full border border-primary object-cover">
                            <div>
                                <span class="font-status-code text-sm text-on-surface">${u.name}</span>
                                <span class="block text-[10px] text-outline">${u.location}</span>
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
                    const div = document.createElement('div');
                    div.className = `flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'} mb-2`;
                    div.innerHTML = `
                        <div class="${isMe ? 'bg-primary text-on-primary' : 'bg-surface-variant text-on-surface'} p-2 rounded-lg text-sm">
                            ${m.content}
                        </div>
                        <span class="text-[8px] text-outline mt-1">${new Date(m.created_at).toLocaleTimeString()}</span>
                    `;
                    chatMessages.appendChild(div);
                });
                chatMessages.scrollTop = chatMessages.scrollHeight;
            } catch(e) { console.error(e); }
        }

        btnSendMsg.addEventListener('click', async () => {
            const text = msgInput.value;
            if (!text.trim() || !activeChatUser) return;
            await fetch(`${API_URL}/messages`, {
                method: 'POST',
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({
                    from_user_id: user.id,
                    to_user_id: activeChatUser,
                    content: text
                })
            });
            msgInput.value = '';
            loadMessages();
        });

        loadNodes();
    }

    // --- INITIALIZATION WIRING ---
    if (feedContainer) {
        loadFeed();
        loadStories();
    }
});
