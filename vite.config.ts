// vite.config.ts
import { defineConfig } from 'vite';

const repo = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? '';
const inCI = !!process.env.GITHUB_ACTIONS;

export default defineConfig({
    base: inCI && repo ? `/${repo}/` : '/',
    build: { outDir: 'dist' }
});
