import { reactRouter } from '@react-router/dev/vite'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { reactDocs } from './plugin/index.ts'

// The docs of ui: `pnpm --filter ui dev` serves them, and `docs:build`
// prerenders them to `dist/client`.
export default defineConfig({
	// The root is this folder for each command, also for the preview server
	// that the prerender starts from the package folder.
	root: import.meta.dirname,
	plugins: [reactDocs(), tailwindcss(), reactRouter()],
	server: {
		port: 3456,
		// Transform the shell on server start, so the first page does not wait for it.
		warmup: { clientFiles: ['./app/root.tsx', './app/sidebar.tsx', './kit/index.ts'] },
	},
	// Pre-bundle the packages that only a page reaches. Left to discovery, Vite
	// finds each on the first visit to its page, bundles again, and reloads
	// the page. The Shiki worker of `CodeBlock` imports the Shiki modules.
	optimizeDeps: {
		include: [
			'@dnd-kit/core',
			'@dnd-kit/sortable',
			'@dnd-kit/utilities',
			'@floating-ui/react',
			'@tanstack/react-table',
			'@tanstack/react-virtual',
			'lucide-react',
			'marked',
			'motion/react',
			'shiki/core',
			'shiki/engine/javascript',
			'shiki/langs',
			'shiki/themes',
		],
	},
	build: { target: 'esnext' },
	// The Shiki worker of `CodeBlock` needs the `es` format (see `CodeBlock`).
	worker: { format: 'es' },
	// Tailwind runs through its Vite plugin. The `postcss.config.mjs` of the
	// repository is for the Next.js apps, so Vite does not look for one.
	css: { postcss: { plugins: [] } },
})
