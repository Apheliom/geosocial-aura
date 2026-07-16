const fs = require('fs');
const files = ['public/index.html', 'public/map.html', 'public/radar.html', 'public/nodes.html'];

const navBarReplacement = `
<div class="flex items-center gap-4 text-primary relative">
<button id="btn-notifications" class="hover:text-primary-fixed-dim transition-colors duration-300 relative" title="Notificaciones">
    <span class="material-symbols-outlined">notifications</span>
    <div id="notif-badge" class="absolute top-0 right-0 w-2 h-2 bg-error rounded-full hidden shadow-[0_0_5px_red]"></div>
</button>
<div id="notif-dropdown" class="absolute top-10 right-16 w-64 bg-surface-container-high border border-outline-variant rounded shadow-lg hidden flex-col overflow-hidden z-50">
    <div class="p-2 border-b border-outline-variant text-xs font-label-caps text-outline">NOTIFICACIONES</div>
    <ul id="notif-list" class="max-h-60 overflow-y-auto flex flex-col text-sm text-on-surface">
        <li class="p-2 text-center text-outline text-xs">Sin notificaciones</li>
    </ul>
</div>

<button id="btn-settings" class="hover:text-primary-fixed-dim transition-colors duration-300" title="Ajustes">
    <span class="material-symbols-outlined">settings</span>
</button>
<button id="btn-logout" class="hover:text-error transition-colors duration-300" title="Cerrar Sesión">
    <span class="material-symbols-outlined">logout</span>
</button>
<span class="current-user-name font-status-code text-sm hidden md:inline"></span>
<div class="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant cursor-pointer" id="btn-avatar-settings">
<img alt="User Avatar" class="current-user-avatar w-full h-full object-cover" src=""/>
</div>
</div>
`;

const settingsModal = `
<!-- Modal Ajustes -->
<div id="settings-modal" class="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 hidden flex items-center justify-center">
    <div class="bg-surface-container-high p-6 rounded-lg border border-primary/50 shadow-[0_0_30px_rgba(0,219,231,0.2)] w-full max-w-sm relative z-55">
        <h3 class="font-status-code text-primary mb-4 flex items-center gap-2"><span class="material-symbols-outlined">settings</span> AJUSTES DE NODO</h3>
        <form id="form-settings" class="flex flex-col gap-4">
            <div class="flex items-center gap-4 mb-2">
                <div class="w-16 h-16 rounded-full overflow-hidden border border-primary bg-surface-dim">
                    <img id="settings-avatar-preview" src="" class="w-full h-full object-cover">
                </div>
                <label class="cursor-pointer bg-surface-variant px-3 py-1 rounded text-xs hover:bg-primary hover:text-on-primary transition-colors text-center">
                    Cambiar Foto
                    <input type="file" id="settings-avatar-input" class="hidden" accept="image/*">
                </label>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-outline block mb-1">NOMBRE PÚBLICO</label>
                <input type="text" id="settings-name" class="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 outline-none focus:border-primary" required>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-outline block mb-1">USUARIO</label>
                <input type="text" id="settings-username" class="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 outline-none focus:border-primary" required>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-outline block mb-1">CONTRASEÑA</label>
                <input type="password" id="settings-password" class="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 outline-none focus:border-primary">
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-outline block mb-1">BIOGRAFÍA</label>
                <textarea id="settings-bio" class="w-full bg-surface-dim border border-outline-variant text-on-surface text-sm rounded px-3 py-2 outline-none focus:border-primary h-20 resize-none" placeholder="Escribe una breve biografía..."></textarea>
            </div>
            <div>
                <label class="font-label-caps text-[10px] text-outline block mb-1">MIS INTERESES (MEETUPS)</label>
                <div id="settings-interests-pills" class="flex flex-wrap gap-1.5 py-1">
                    <button type="button" class="interest-pill px-2 py-0.5 rounded bg-surface border border-outline-variant text-[8px] font-label-caps hover:border-primary hover:text-primary transition-all cursor-pointer" data-interest="Fútbol">Fútbol</button>
                    <button type="button" class="interest-pill px-2 py-0.5 rounded bg-surface border border-outline-variant text-[8px] font-label-caps hover:border-primary hover:text-primary transition-all cursor-pointer" data-interest="Café">Café</button>
                    <button type="button" class="interest-pill px-2 py-0.5 rounded bg-surface border border-outline-variant text-[8px] font-label-caps hover:border-primary hover:text-primary transition-all cursor-pointer" data-interest="Juegos de mesa">Juegos de Mesa</button>
                    <button type="button" class="interest-pill px-2 py-0.5 rounded bg-surface border border-outline-variant text-[8px] font-label-caps hover:border-primary hover:text-primary transition-all cursor-pointer" data-interest="Música">Música</button>
                    <button type="button" class="interest-pill px-2 py-0.5 rounded bg-surface border border-outline-variant text-[8px] font-label-caps hover:border-primary hover:text-primary transition-all cursor-pointer" data-interest="Charlar">Charlar</button>
                    <button type="button" class="interest-pill px-2 py-0.5 rounded bg-surface border border-outline-variant text-[8px] font-label-caps hover:border-primary hover:text-primary transition-all cursor-pointer" data-interest="Cine">Cine</button>
                </div>
                <input type="hidden" id="settings-interests-input" value="">
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <button type="button" id="close-settings-modal" class="px-4 py-2 text-outline hover:text-on-surface text-sm">Cerrar</button>
                <button type="submit" class="px-4 py-2 bg-primary text-on-primary rounded text-sm hover:shadow-[0_0_10px_rgba(0,219,231,0.5)]">Guardar Cambios</button>
            </div>
        </form>
    </div>
</div>
</body>
`;

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf-8');
    
    // Inject navbar
    content = content.replace(/<div class="flex items-center gap-4 text-primary">[\s\S]*?<\/nav>/, navBarReplacement.trim() + '\n</nav>');
    
    // Inject settings modal, replacing existing modal if present
    if (content.includes('<!-- Modal Ajustes -->')) {
        content = content.replace(/<!-- Modal Ajustes -->[\s\S]*?<\/body>/, settingsModal);
    } else {
        content = content.replace('</body>', settingsModal);
    }
    
    // Inject favicon if not present
    if (!content.includes('favicon.svg') && !content.includes('rel="icon"')) {
        content = content.replace('</head>', '    <link rel="icon" type="image/svg+xml" href="/favicon.svg">\n</head>');
    }
    
    fs.writeFileSync(f, content);
});
console.log("HTML files updated successfully!");
