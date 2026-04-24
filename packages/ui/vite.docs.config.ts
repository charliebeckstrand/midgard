import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { componentApiPlugin } from './src/docs/vite-plugin-component-api'
import { demoMetasPlugin } from './src/docs/vite-plugin-demo-metas'

export default defineConfig({
	base: '/',
	root: 'src/docs',
	plugins: [react(), tailwindcss(), componentApiPlugin(), demoMetasPlugin()],
	server: { port: 3456 },
	resolve: {
		alias: [
			// Use the web bundle (web-relevant languages only) instead of all ~300 grammars.
			// The public CodeBlock component still references 'shiki' — this alias only
			// affects the docs build. Regex ensures shiki/wasm etc. are not rewritten.
			{ find: /^shiki$/, replacement: 'shiki/bundle/web' },
		],
	},
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks(id) {
					if (id.includes('node_modules/react-dom') || id.includes('node_modules/react/')) {
						return 'vendor-react'
					}

					if (
						id.includes('node_modules/motion') ||
						id.includes('node_modules/@floating-ui') ||
						id.includes('node_modules/lucide-react')
					) {
						return 'vendor-ui'
					}
				},
			},
		},
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'lucide-react', 'motion', '@floating-ui/react', 'shiki'],
	},
})
