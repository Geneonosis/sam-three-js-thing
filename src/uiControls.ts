export function setupUIControls(
    toggleCallback: () => void,
    speedCallback: (value: number) => void,
    worldGradientCallback: (startColor: string, endColor: string) => void
) {
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

    const sliderLabel = document.createElement('label');
    sliderLabel.htmlFor = 'speed-slider';
    sliderLabel.style.fontFamily = 'Arial, sans-serif';
    sliderLabel.textContent = 'Speed';
    container.appendChild(sliderLabel);

    // slider to control the speed of the specified component's rotation
    const slider = document.createElement('input');
    slider.ariaLabel = 'Speed Slider';
    slider.type = 'range';
    slider.min = '0';
    slider.max = '2000';
    slider.value = '100';
    slider.id = 'speed-slider';
    slider.style.marginLeft = '10px';
    slider.addEventListener('input', (event) => {
        const target = event.target as HTMLInputElement;
        const value = parseInt(target.value);
        speedCallback(value);
    });
    container.appendChild(slider);

    //create two color picker input controls for the color picker tool for the world gradient
    const startColorInput = document.createElement('input');
    startColorInput.ariaLabel = 'Start Color Picker';
    startColorInput.type = 'color';
    startColorInput.value = '#000000';
    startColorInput.style.marginLeft = '10px';

    const endColorInput = document.createElement('input');
    endColorInput.ariaLabel = 'End Color Picker';
    endColorInput.type = 'color';
    endColorInput.value = '#ffffff';
    endColorInput.style.marginLeft = '10px';

    startColorInput.addEventListener('input', () => {
        worldGradientCallback(startColorInput.value, endColorInput.value);
    });

    endColorInput.addEventListener('input', () => {
        worldGradientCallback(startColorInput.value, endColorInput.value);
    });

    container.appendChild(startColorInput);
    container.appendChild(endColorInput);

    document.body.appendChild(container);
}
