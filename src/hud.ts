export function createHUD() {
    const hud = document.createElement('div');
    hud.id = 'hud';
    hud.style.position = 'absolute';
    hud.style.left = '20px';
    hud.style.bottom = '20px';
    hud.style.maxWidth = '40rem';
    hud.style.padding = '12px 16px';
    hud.style.borderRadius = '10px';
    hud.style.backdropFilter = 'blur(8px)';
    hud.style.background = 'rgba(0,0,0,0.35)';
    hud.style.color = 'white';
    hud.style.fontFamily = 'system-ui, sans-serif';
    hud.style.lineHeight = '1.35';
    hud.style.fontSize = '14px';
    hud.style.display = 'none';
    document.body.appendChild(hud);

    const set = (html: string) => {
        const content = html.trim();
        if (content.length === 0) {
            hud.innerHTML = '';
            hud.style.display = 'none';
            return;
        }

        hud.innerHTML = html;
        hud.style.display = 'block';
    };
    return { set };
}
