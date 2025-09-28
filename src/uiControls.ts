export function setupUIControls(toggleCallback: () => void) {
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '1000';

    const button = document.createElement('button');
    button.id = 'toggle-button';
    button.textContent = 'Toggle Dark/Light Mode';
    button.addEventListener('click', toggleCallback);
    container.appendChild(button);
    document.body.appendChild(container);
}
