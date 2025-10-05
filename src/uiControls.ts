export type NavControl = {
    icon: string;
    aria: string;
    handler: () => void;
};

export type ControlsOptions = {
    host?: HTMLElement;
    navControls?: NavControl[];
};

function createIconButton(icon: string, aria: string, handler: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hud-nav__button';
    button.setAttribute('aria-label', aria);
    button.title = aria;
    button.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true">${icon}</span>`;
    button.addEventListener('click', handler);
    return button;
}

function createActionButton(label: string, handler: () => void): HTMLButtonElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'hud-panel__action';
    button.textContent = label;
    button.addEventListener('click', handler);
    return button;
}

function addRangeRow(
    panel: HTMLElement,
    label: string,
    options: {
        id: string;
        min: string;
        max: string;
        step?: string;
        value: string;
        ariaLabel: string;
        onInput: (event: Event) => void;
    },
): HTMLInputElement {
    const row = document.createElement('label');
    row.className = 'hud-panel__row';

    const text = document.createElement('span');
    text.className = 'hud-panel__label';
    text.textContent = label;

    const input = document.createElement('input');
    input.type = 'range';
    input.id = options.id;
    input.className = 'hud-panel__slider';
    input.min = options.min;
    input.max = options.max;
    input.value = options.value;
    input.setAttribute('aria-label', options.ariaLabel);
    if (options.step !== undefined) input.step = options.step;
    input.addEventListener('input', options.onInput);

    row.append(text, input);
    panel.appendChild(row);
    return input;
}

function addColorRow(panel: HTMLElement, label: string, inputs: HTMLElement[]): void {
    const row = document.createElement('div');
    row.className = 'hud-panel__row';

    const text = document.createElement('span');
    text.className = 'hud-panel__label';
    text.textContent = label;

    const group = document.createElement('div');
    group.className = 'hud-panel__color-group';
    inputs.forEach((input) => group.appendChild(input));

    row.append(text, group);
    panel.appendChild(row);
}

function createColorInput(id: string, value: string, ariaLabel: string): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'color';
    input.id = id;
    input.value = value;
    input.className = 'hud-panel__color';
    input.setAttribute('aria-label', ariaLabel);
    return input;
}

export function setupUIControls(
    toggleCallback: () => void,
    speedCallback: (value: number) => void,
    worldGradientCallback: (startColor: string, endColor: string) => void,
    lightContorlsCallback: (color: string, intensity: number) => void,
    cubeControls: (materialColor: string, metalness: number, roughness: number) => void,
    options?: ControlsOptions,
) {
    const host = options?.host ?? document.body;
    const navControls = options?.navControls ?? [];

    const wrapper = document.createElement('div');
    wrapper.className = 'hud-controls';
    if (!options?.host) wrapper.classList.add('hud-controls--floating');

    const nav = document.createElement('div');
    nav.className = 'hud-nav';
    wrapper.appendChild(nav);

    navControls.forEach(({ icon, aria, handler }) => {
        nav.appendChild(createIconButton(icon, aria, handler));
    });

    const panel = document.createElement('div');
    panel.className = 'hud-panel';
    wrapper.appendChild(panel);

    let isPanelOpen = false;
    const togglePanel = () => {
        isPanelOpen = !isPanelOpen;
        panel.classList.toggle('hud-panel--open', isPanelOpen);
        settingsButton.setAttribute('aria-expanded', String(isPanelOpen));
    };

    const settingsButton = createIconButton('settings', 'Toggle settings menu', togglePanel);
    settingsButton.id = 'controls-panel-toggle';
    settingsButton.setAttribute('aria-expanded', 'false');
    nav.appendChild(settingsButton);

    const actions = document.createElement('div');
    actions.className = 'hud-panel__actions';

    const darkModeButton = createActionButton('Toggle Dark/Light Mode', toggleCallback);
    darkModeButton.id = 'toggle-button';
    actions.appendChild(darkModeButton);

    const startColorInput = createColorInput('gradient-start', '#000000', 'Start Color Picker');
    const endColorInput = createColorInput('gradient-end', '#ffffff', 'End Color Picker');
    const updateGradient = () => {
        worldGradientCallback(startColorInput.value, endColorInput.value);
    };
    startColorInput.addEventListener('input', updateGradient);
    endColorInput.addEventListener('input', updateGradient);

    addColorRow(panel, 'Gradient', [startColorInput, endColorInput]);

    const speedSlider = addRangeRow(panel, 'Speed', {
        id: 'speed-slider',
        min: '0',
        max: '2000',
        value: '100',
        ariaLabel: 'Speed Slider',
        onInput: (event: Event) => {
            const target = event.target as HTMLInputElement;
            speedCallback(parseInt(target.value, 10));
        },
    });

    const lightColorInput = createColorInput('light-color', '#87cefa', 'Light Color Picker');
    const intensitySlider = addRangeRow(panel, 'Light Intensity', {
        id: 'intensity-slider',
        min: '0',
        max: '2',
        step: '0.01',
        value: '1',
        ariaLabel: 'Light Intensity Slider',
        onInput: (event: Event) => {
            const target = event.target as HTMLInputElement;
            lightContorlsCallback(lightColorInput.value, parseFloat(target.value));
        },
    });
    lightColorInput.addEventListener('input', () => {
        lightContorlsCallback(lightColorInput.value, parseFloat(intensitySlider.value));
    });
    addColorRow(panel, 'Lighting', [lightColorInput]);

    const materialColorInput = createColorInput('material-color', '#ffffff', 'Material Color Picker');
    addColorRow(panel, 'Material', [materialColorInput]);

    let metalnessSlider: HTMLInputElement;
    let roughnessSlider: HTMLInputElement;

    const updateMaterial = () => {
        cubeControls(
            materialColorInput.value,
            parseFloat(metalnessSlider.value),
            parseFloat(roughnessSlider.value),
        );
    };

    materialColorInput.addEventListener('input', updateMaterial);

    metalnessSlider = addRangeRow(panel, 'Metalness', {
        id: 'metalness-slider',
        min: '0',
        max: '1',
        step: '0.01',
        value: '0.5',
        ariaLabel: 'Metalness Slider',
        onInput: updateMaterial,
    });

    roughnessSlider = addRangeRow(panel, 'Roughness', {
        id: 'roughness-slider',
        min: '0',
        max: '1',
        step: '0.001',
        value: '0.5',
        ariaLabel: 'Roughness Slider',
        onInput: updateMaterial,
    });

    const saveButton = createActionButton('Save Settings', () => {
        saveSettings(
            darkModeButton.textContent === 'Switch to Light Mode',
            parseInt(speedSlider.value, 10),
            startColorInput.value,
            endColorInput.value,
            lightColorInput.value,
            parseFloat(intensitySlider.value),
            materialColorInput.value,
            parseFloat(metalnessSlider.value),
            parseFloat(roughnessSlider.value),
        );
    });
    saveButton.id = 'save-button';

    const loadButton = createActionButton('Load Settings', () => {
        const settings = loadSettings();
        if (!settings) return;

        darkModeButton.textContent = settings.darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode';
        speedSlider.value = String(settings.speed);
        startColorInput.value = settings.startColor;
        endColorInput.value = settings.endColor;
        lightColorInput.value = settings.lightColor;
        intensitySlider.value = String(settings.lightIntensity);
        materialColorInput.value = settings.materialColor;
        metalnessSlider.value = String(settings.metalness);
        roughnessSlider.value = String(settings.roughness);

        speedCallback(settings.speed);
        worldGradientCallback(settings.startColor, settings.endColor);
        lightContorlsCallback(settings.lightColor, settings.lightIntensity);
        cubeControls(settings.materialColor, settings.metalness, settings.roughness);
    });
    loadButton.id = 'load-button';

    actions.append(darkModeButton, saveButton, loadButton);
    panel.appendChild(actions);

    host.appendChild(wrapper);
}

export function saveSettings(
    darkMode: boolean,
    speed: number,
    startColor: string,
    endColor: string,
    lightColor: string,
    lightIntensity: number,
    materialColor: string,
    metalness: number,
    roughness: number,
) {
    const settings = {
        darkMode,
        speed,
        startColor,
        endColor,
        lightColor,
        lightIntensity,
        materialColor,
        metalness,
        roughness,
    };
    console.log('Saving settings to session storage', settings);
    sessionStorage.setItem('settings', JSON.stringify(settings));
}

const loadSettings = () => {
    const savedSettings = sessionStorage.getItem('settings');
    if (savedSettings) {
        return JSON.parse(savedSettings);
    }
    return null;
};
