import * as THREE from 'three';
import type { Vector3Tuple } from 'three';
import type { Topic } from './TopicRouter';

/**
 * Shape of the metadata block each topic file must provide.
 * Position/LookAt arrays are expressed as JSON to keep parsing deterministic.
 *
 * @interface TopicFrontmatter
 * @property {string} id Unique identifier used by the router.
 * @property {string} title Human-readable title for navigation/HUD copy.
 * @property {Vector3Tuple} position Camera destination in world space.
 * @property {Vector3Tuple} [lookAt] Optional vector the camera should face.
 * @property {Vector3Tuple} [pagePosition] Optional override for where the topic page should live in the scene.
 * @property {string} [anchorId] Optional scene anchor name for dynamic placement.
 * @property {string} [hud] Multiline HTML/markup rendered inside the HUD overlay.
 * @property {number} [order] Sorting hint when filenames are not strictly ordered.
 */
export interface TopicFrontmatter {
    id: string;
    title: string;
    position: Vector3Tuple;
    lookAt?: Vector3Tuple;
    pagePosition?: Vector3Tuple;
    anchorId?: string;
    hud?: string;
    order?: number;
}

/**
 * Minimal interface describing the HUD surface we update when topics change.
 * Allows the loader to stay decoupled from concrete HUD implementation.
 */
interface Hud {
    set: (html: string) => void;
}

/**
 * Parsed representation of a topic file, separating frontmatter metadata from HTML content.
 */
interface ParsedTopic {
    frontmatter: TopicFrontmatter;
    content: string;
}

export type RenderPagePayload = {
    id: string;
    title: string;
    content: string;
    fallbackTarget: THREE.Vector3;
    anchorId?: string;
};

export interface LoadedTopicBundle {
    topics: Topic[];
    pages: RenderPagePayload[];
}

/** Pre-import every topic HTML file so the data is available without extra fetches. */
const topicModules = import.meta.glob('./topics/*.html', {
    eager: true,
    query: '?raw',
    import: 'default',
}) as Record<string, string>;

/**
 * Load every frontmatter-backed topic file under `src/topics` and materialize
 * them into `Topic` instances wired up with HUD callbacks.
 *
 * @param hud HUD instance used to render topic copy on entry.
 * @returns Sorted bundle containing Topics for the router and page payloads for world rendering.
 *
 * @example
 * ```ts
 * const hud = createHUD();
 * const { topics, pages } = loadTopics(hud);
 * topics.forEach(topic => router.add(topic));
 * pages.forEach(page => worldPageManager.register(page));
 * ```
 */
export function loadTopics(hud: Hud): LoadedTopicBundle {
    const parsedTopics = Object.entries(topicModules).map(([path, raw]) => parseTopicFile(path, raw));

    parsedTopics.sort((a, b) => {
        const orderA = a.frontmatter.order ?? Number.POSITIVE_INFINITY;
        const orderB = b.frontmatter.order ?? Number.POSITIVE_INFINITY;
        if (orderA !== orderB) return orderA - orderB;
        return a.frontmatter.title.localeCompare(b.frontmatter.title);
    });

    const topics: Topic[] = [];
    const pages: RenderPagePayload[] = [];

    parsedTopics.forEach(({ frontmatter, content }) => {
        const hudMarkup = frontmatter.hud ? formatHudMarkup(frontmatter.hud) : undefined;

        topics.push({
            id: frontmatter.id,
            title: frontmatter.title,
            position: toVector3(frontmatter.position),
            lookAt: frontmatter.lookAt ? toVector3(frontmatter.lookAt) : undefined,
            onEnter: () => hud.set(hudMarkup ?? ''),
        });

        const fallbackTuple = frontmatter.pagePosition ?? frontmatter.lookAt ?? frontmatter.position;
        pages.push({
            id: frontmatter.id,
            title: frontmatter.title,
            content,
            fallbackTarget: toVector3(fallbackTuple),
            anchorId: frontmatter.anchorId,
        });
    });

    return { topics, pages };
}

/**
 * Split a raw topic file into frontmatter and HTML content, validating that
 * both opening and closing delimiters exist.
 *
 * @param path Module path reported by `import.meta.glob`.
 * @param raw Raw file contents returned by Vite.
 * @returns ParsedTopic with metadata and HTML body.
 */
function parseTopicFile(path: string, raw: string): ParsedTopic {
    const trimmed = raw.trimStart();
    if (!trimmed.startsWith('---')) {
        throw new Error(`Topic file ${path} is missing frontmatter delimiter`);
    }

    const lines = trimmed.split(/\r?\n/);
    const closingIndex = lines.indexOf('---', 1);
    if (closingIndex === -1) {
        throw new Error(`Topic file ${path} is missing closing frontmatter delimiter`);
    }

    const frontmatterLines = lines.slice(1, closingIndex);
    const contentLines = lines.slice(closingIndex + 1);

    const frontmatter = parseFrontmatter(frontmatterLines, path);
    validateFrontmatter(frontmatter, path);
    const content = contentLines.join('\n').trim();

    return { frontmatter, content };
}

/**
 * Reduce the frontmatter block into key/value pairs while coercing common value
 * shapes (numbers, booleans, JSON arrays/objects, quoted strings).
 *
 * @param lines Lines extracted from the frontmatter segment.
 * @param path File path used for error messages.
 * @returns Strongly-typed frontmatter object.
 */
function parseFrontmatter(lines: string[], path: string): Partial<TopicFrontmatter> {
    const data: Record<string, unknown> = {};

    let index = 0;
    while (index < lines.length) {
        const rawLine = lines[index];
        const trimmedLine = rawLine.trim();
        index++;

        if (trimmedLine.length === 0) continue;

        const separatorIndex = rawLine.indexOf(':');
        if (separatorIndex === -1) {
            throw new Error(`Invalid frontmatter entry in ${path}: "${rawLine}"`);
        }

        const key = rawLine.slice(0, separatorIndex).trim();
        if (!key) {
            throw new Error(`Invalid frontmatter key in ${path}: "${rawLine}"`);
        }

        const valuePortion = rawLine.slice(separatorIndex + 1).trim();

        if (valuePortion === '|' || valuePortion === '>') {
            const blockLines: string[] = [];

            while (index < lines.length) {
                const blockCandidate = lines[index];
                const trimmedCandidate = blockCandidate.trimEnd();

                if (trimmedCandidate.length === 0) {
                    blockLines.push('');
                    index++;
                    continue;
                }

                const indentMatch = blockCandidate.match(/^\s+/);
                if (!indentMatch) break;

                const content = blockCandidate.slice(indentMatch[0].length);
                blockLines.push(content);
                index++;
            }

            const blockValue = valuePortion === '>'
                ? blockLines.join(' ').replace(/\s+/g, ' ').trim()
                : blockLines.join('\n');
            data[key] = blockValue;
            continue;
        }

        data[key] = coerceValue(valuePortion);
    }

    return data as Partial<TopicFrontmatter>;
}

/**
 * Coerce scalar string values into richer runtime types when possible.
 * Supports JSON aggregates, quoted strings, booleans, and numbers out of the box.
 *
 * @param value Raw string extracted from the frontmatter line.
 * @returns Parsed representation best matching the supplied literal.
 */
function coerceValue(value: string): unknown {
    if (value.startsWith('[') || value.startsWith('{')) {
        try {
            return JSON.parse(value);
        } catch (error) {
            console.warn('Failed to parse JSON frontmatter value', value, error);
            return value;
        }
    }

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
        return value.slice(1, -1);
    }

    if (value === 'true' || value === 'false') {
        return value === 'true';
    }

    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
        return numeric;
    }

    return value;
}

/**
 * Ensure required fields are present and vector tuples have the expected shape.
 *
 * @param frontmatter Partially-typed metadata candidate.
 * @param path File path used for descriptive error messages.
 */
function validateFrontmatter(frontmatter: Partial<TopicFrontmatter>, path: string): asserts frontmatter is TopicFrontmatter {
    if (typeof frontmatter.id !== 'string') {
        throw new Error(`Topic file ${path} is missing a string id`);
    }

    if (typeof frontmatter.title !== 'string') {
        throw new Error(`Topic file ${path} is missing a string title`);
    }

    if (!Array.isArray(frontmatter.position) || frontmatter.position.length !== 3 || !frontmatter.position.every((v) => typeof v === 'number')) {
        throw new Error(`Topic file ${path} must supply numeric position [x, y, z]`);
    }

    if (frontmatter.lookAt) {
        if (!Array.isArray(frontmatter.lookAt) || frontmatter.lookAt.length !== 3 || !frontmatter.lookAt.every((v) => typeof v === 'number')) {
            throw new Error(`Topic file ${path} has invalid lookAt; expected numeric [x, y, z]`);
        }
    }

    if (frontmatter.pagePosition) {
        if (!Array.isArray(frontmatter.pagePosition) || frontmatter.pagePosition.length !== 3 || !frontmatter.pagePosition.every((v) => typeof v === 'number')) {
            throw new Error(`Topic file ${path} has invalid pagePosition; expected numeric [x, y, z]`);
        }
    }

    if (frontmatter.anchorId !== undefined && typeof frontmatter.anchorId !== 'string') {
        throw new Error(`Topic file ${path} has invalid anchorId; expected string identifier`);
    }

    if (frontmatter.hud !== undefined && typeof frontmatter.hud !== 'string') {
        throw new Error(`Topic file ${path} has invalid hud; expected multiline string`);
    }
}

/**
 * Convert tuple notation from frontmatter into a Three.js vector instance.
 *
 * @param tuple Frontmatter-sourced vector represented as `[x, y, z]`.
 * @returns New `THREE.Vector3` instance pointing at the tuple’s coordinates.
 */
function toVector3(tuple: Vector3Tuple): THREE.Vector3 {
    return new THREE.Vector3(tuple[0], tuple[1], tuple[2]);
}

function formatHudMarkup(value: string): string {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
        return '';
    }

    if (/<[a-z][^>]*>/i.test(trimmed)) {
        return trimmed;
    }

    const paragraphs = trimmed
        .split(/\n{2,}/)
        .map((block) => block
            .split(/\n/)
            .map((line) => line.trim())
            .filter((line) => line.length > 0)
            .join('<br>'))
        .filter((block) => block.length > 0);

    if (paragraphs.length === 0) {
        return `<p>${trimmed.replace(/\n/g, '<br>')}</p>`;
    }

    return paragraphs.map((block) => `<p>${block}</p>`).join('');
}
