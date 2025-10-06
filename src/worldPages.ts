import * as THREE from 'three';
import type { RenderPagePayload } from './topicLoader';

type AnchorResolver = (anchorId: string, out: THREE.Vector3) => boolean;

type ManagedPanel = {
    id: string;
    mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
    texture: THREE.CanvasTexture;
    fallbackTarget: THREE.Vector3;
    anchorId?: string;
    isActive: boolean;
};

type PanelMap = Map<string, ManagedPanel>;

type LinesLayout = Array<{ text: string; font: string; lineHeight: number }>;

const PX_TO_WORLD = 0.004;
const PADDING_X = 32;
const PADDING_Y = 24;
const MAX_CANVAS_WIDTH = 600;

export function createWorldPageManager(
    scene: THREE.Scene,
    camera: THREE.Camera,
    resolveAnchor: AnchorResolver,
) {
    const panels: PanelMap = new Map();
    const group = new THREE.Group();
    group.name = 'topic-pages';
    scene.add(group);

    const anchorPosition = new THREE.Vector3();
    const targetPosition = new THREE.Vector3();

    const registerPage = ({ id, title, content, fallbackTarget, anchorId }: RenderPagePayload) => {
        const html = content.trim();
        if (!html) return;

        const existing = panels.get(id);
        const { texture, width, height } = renderHtmlToTexture(`<h3>${title}</h3>${html}`);
        const planeGeometry = new THREE.PlaneGeometry(width * PX_TO_WORLD, height * PX_TO_WORLD);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            depthWrite: false,
        });

        if (existing) {
            existing.mesh.geometry.dispose();
            existing.mesh.material.map?.dispose();
            existing.mesh.material.dispose();
            existing.mesh.geometry = planeGeometry;
            existing.mesh.material = material;
            existing.texture = texture;
            existing.fallbackTarget.copy(fallbackTarget);
            existing.anchorId = anchorId;
        } else {
            const mesh = new THREE.Mesh(planeGeometry, material);
            mesh.name = `topic-page-${id}`;
            mesh.renderOrder = 10;
            mesh.frustumCulled = false;
            mesh.userData.topicId = id;
            group.add(mesh);
            panels.set(id, {
                id,
                mesh,
                texture,
                fallbackTarget: fallbackTarget.clone(),
                anchorId,
                isActive: false,
            });
        }
    };

    const setActivePage = (topicId: string | null) => {
        panels.forEach((panel) => {
            panel.isActive = topicId !== null && panel.id === topicId;
        });
    };

    const update = () => {
        panels.forEach((panel) => {
            const mesh = panel.mesh;
            const hasAnchor = panel.anchorId && resolveAnchor(panel.anchorId, anchorPosition);
            targetPosition.copy(hasAnchor ? anchorPosition : panel.fallbackTarget);
            mesh.position.copy(targetPosition);
            mesh.quaternion.copy(camera.quaternion);

            const material = mesh.material;
            const targetOpacity = panel.isActive ? 1 : 0.35;
            const targetScale = panel.isActive ? 1 : 0.85;

            material.opacity = THREE.MathUtils.lerp(material.opacity, targetOpacity, 0.25);
            mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x || 1, targetScale, 0.25));
        });
    };

    const dispose = () => {
        panels.forEach((panel) => {
            panel.mesh.geometry.dispose();
            panel.mesh.material.map?.dispose();
            panel.mesh.material.dispose();
            group.remove(panel.mesh);
        });
        panels.clear();
        scene.remove(group);
    };

    return { registerPage, setActivePage, update, dispose };
}

function renderHtmlToTexture(html: string): { texture: THREE.CanvasTexture; width: number; height: number } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Unable to acquire 2D context for page rendering');
    }

    const blocks = extractBlocks(html);
    const lines = layoutBlocks(ctx, blocks, MAX_CANVAS_WIDTH - PADDING_X * 2);

    const contentHeight = lines.reduce((sum, line) => sum + line.lineHeight, 0);
    const canvasWidth = MAX_CANVAS_WIDTH;
    const canvasHeight = Math.max(PADDING_Y * 2 + contentHeight, 128);
    const dpr = Math.min(window.devicePixelRatio ?? 1, 2);

    canvas.width = Math.round(canvasWidth * dpr);
    canvas.height = Math.round(canvasHeight * dpr);

    const drawCtx = canvas.getContext('2d');
    if (!drawCtx) {
        throw new Error('Unable to acquire 2D context for drawing');
    }

    drawCtx.scale(dpr, dpr);
    drawCtx.imageSmoothingEnabled = true;
    drawCtx.imageSmoothingQuality = 'high';

    drawRoundedRect(drawCtx, 0, 0, canvasWidth, canvasHeight, 20, 'rgba(12, 12, 20, 0.85)');

    let cursorY = PADDING_Y;
    lines.forEach(({ text, font, lineHeight }) => {
        drawCtx.font = font;
        drawCtx.fillStyle = '#ffffff';
        drawCtx.textBaseline = 'top';
        drawCtx.fillText(text, PADDING_X, cursorY);
        cursorY += lineHeight;
    });

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = Math.min(8, texture.anisotropy || 1);
    texture.needsUpdate = true;

    return {
        texture,
        width: canvasWidth,
        height: canvasHeight,
    };
}

type BlockSpec = { text: string; font: string; lineHeight: number };

type HtmlBlock = {
    text: string;
    variant: 'heading' | 'body' | 'list';
};

function extractBlocks(html: string): HtmlBlock[] {
    const container = document.createElement('div');
    container.innerHTML = html;
    const blocks: HtmlBlock[] = [];

    const walk = (node: ChildNode) => {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                blocks.push({ text, variant: 'body' });
            }
            return;
        }

        if (!(node instanceof HTMLElement)) return;

        const tag = node.tagName.toLowerCase();

        if (/^h[1-6]$/.test(tag)) {
            const text = node.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                blocks.push({ text, variant: 'heading' });
            }
            return;
        }

        if (tag === 'ul' || tag === 'ol') {
            Array.from(node.children).forEach((li) => {
                const text = li.textContent?.replace(/\s+/g, ' ').trim();
                if (text) {
                    blocks.push({ text: `• ${text}`, variant: 'list' });
                }
            });
            return;
        }

        if (tag === 'p' || tag === 'div' || tag === 'section') {
            const text = node.textContent?.replace(/\s+/g, ' ').trim();
            if (text) {
                blocks.push({ text, variant: 'body' });
            }
            return;
        }

        Array.from(node.childNodes).forEach(walk);
    };

    if (container.childNodes.length === 0) {
        const text = container.textContent?.replace(/\s+/g, ' ').trim();
        if (text) blocks.push({ text, variant: 'body' });
    } else {
        Array.from(container.childNodes).forEach(walk);
    }

    return blocks;
}

function layoutBlocks(ctx: CanvasRenderingContext2D, blocks: HtmlBlock[], maxWidth: number): LinesLayout {
    const lines: LinesLayout = [];

    blocks.forEach((block, index) => {
        const spec = blockToSpec(block);
        const wrapped = wrapText(ctx, block.text, spec, maxWidth);
        lines.push(...wrapped);
        if (index !== blocks.length - 1) {
            lines.push({ text: '', font: spec.font, lineHeight: spec.lineHeight * 0.5 });
        }
    });

    return lines;
}

function blockToSpec(block: HtmlBlock): BlockSpec {
    switch (block.variant) {
        case 'heading':
            return { text: block.text, font: '600 28px "Inter", system-ui', lineHeight: 36 };
        case 'list':
            return { text: block.text, font: '400 18px "Inter", system-ui', lineHeight: 26 };
        default:
            return { text: block.text, font: '400 18px "Inter", system-ui', lineHeight: 28 };
    }
}

function wrapText(
    ctx: CanvasRenderingContext2D,
    text: string,
    spec: BlockSpec,
    maxWidth: number,
): LinesLayout {
    ctx.font = spec.font;
    const words = text.split(/\s+/);
    const lines: LinesLayout = [];
    let current = '';

    words.forEach((word) => {
        const next = current.length === 0 ? word : `${current} ${word}`;
        const metrics = ctx.measureText(next);
        if (metrics.width > maxWidth && current.length > 0) {
            lines.push({ text: current, font: spec.font, lineHeight: spec.lineHeight });
            current = word;
        } else {
            current = next;
        }
    });

    if (current.length > 0) {
        lines.push({ text: current, font: spec.font, lineHeight: spec.lineHeight });
    }

    if (lines.length === 0) {
        lines.push({ text: '', font: spec.font, lineHeight: spec.lineHeight });
    }

    return lines;
}

function drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number,
    fillStyle: string,
) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.restore();
}
