export function setupUIControls(
    toggleCallback: () => void,
    speedCallback: (value: number) => void,
    worldGradientCallback: (startColor: string, endColor: string) => void,
    lightContorlsCallback: (color: string, intensity: number) => void,
    cubeControls: (materialColor: string, metalness: number, roughness: number) => void,
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

    const lightColorInput = document.createElement('input');
    lightColorInput.ariaLabel = 'Light Color Picker';
    lightColorInput.type = 'color';
    lightColorInput.value = '#87cefa'; // default sky blue
    lightColorInput.style.marginLeft = '10px';
    container.appendChild(lightColorInput);

    const intensityLabel = document.createElement('label');
    intensityLabel.htmlFor = 'intensity-slider';
    intensityLabel.style.fontFamily = 'Arial, sans-serif';
    intensityLabel.style.marginLeft = '10px';
    intensityLabel.textContent = 'Light Intensity';
    container.appendChild(intensityLabel);

    const intensitySlider = document.createElement('input');
    intensitySlider.ariaLabel = 'Light Intensity Slider';
    intensitySlider.type = 'range';
    intensitySlider.min = '0';
    intensitySlider.max = '2';
    intensitySlider.step = '0.01';
    intensitySlider.value = '1';
    intensitySlider.id = 'intensity-slider';
    intensitySlider.style.marginLeft = '10px';
    container.appendChild(intensitySlider);

    const updateLightControls = () => {
        const color = lightColorInput.value;
        const intensity = parseFloat(intensitySlider.value);
        lightContorlsCallback(color, intensity);
    };

    lightColorInput.addEventListener('input', updateLightControls);
    intensitySlider.addEventListener('input', updateLightControls);

    // cube controls
    const materialColorInput = document.createElement('input');
    materialColorInput.ariaLabel = 'Material Color Picker';
    materialColorInput.type = 'color';
    materialColorInput.value = '#ffffff'; // default white
    materialColorInput.style.marginLeft = '10px';
    container.appendChild(materialColorInput);

    const metalnessLabel = document.createElement('label');
    metalnessLabel.htmlFor = 'metalness-slider';
    metalnessLabel.style.fontFamily = 'Arial, sans-serif';
    metalnessLabel.style.marginLeft = '10px';
    metalnessLabel.textContent = 'Metalness';
    container.appendChild(metalnessLabel);

    const metalnessSlider = document.createElement('input');
    metalnessSlider.ariaLabel = 'Metalness Slider';
    metalnessSlider.type = 'range';
    metalnessSlider.min = '0';
    metalnessSlider.max = '1';
    metalnessSlider.step = '0.01';
    metalnessSlider.value = '0.5';
    metalnessSlider.id = 'metalness-slider';
    metalnessSlider.style.marginLeft = '10px';
    container.appendChild(metalnessSlider);

    const roughnessLabel = document.createElement('label');
    roughnessLabel.htmlFor = 'roughness-slider';
    roughnessLabel.style.fontFamily = 'Arial, sans-serif';
    roughnessLabel.style.marginLeft = '10px';
    roughnessLabel.textContent = 'Roughness';
    container.appendChild(roughnessLabel);

    const roughnessSlider = document.createElement('input');
    roughnessSlider.ariaLabel = 'Roughness Slider';
    roughnessSlider.type = 'range';
    roughnessSlider.min = '0';
    roughnessSlider.max = '1';
    roughnessSlider.step = '0.01';
    roughnessSlider.value = '0.5';
    roughnessSlider.id = 'roughness-slider';
    roughnessSlider.style.marginLeft = '10px';
    container.appendChild(roughnessSlider);

    const updateCubeControls = () => {
        const materialColor = materialColorInput.value;
        const metalness = parseFloat(metalnessSlider.value);
        const roughness = parseFloat(roughnessSlider.value);
        cubeControls(materialColor, metalness, roughness);
    };

    materialColorInput.addEventListener('input', updateCubeControls);
    metalnessSlider.addEventListener('input', updateCubeControls);
    roughnessSlider.addEventListener('input', updateCubeControls);

    document.body.appendChild(container);
}
