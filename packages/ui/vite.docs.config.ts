import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	base: '/',
	root: 'src/docs',
	plugins: [react(), tailwindcss()],
	server: { port: 3456 },
	build: {
		target: 'esnext',
		rollupOptions: {
			output: {
				manualChunks: {
					'vendor-react': ['react', 'react-dom'],
					'vendor-shiki': ['shiki'],
					'vendor-ui': ['motion', '@floating-ui/react', 'lucide-react'],
				},
			},
		},
	},
	optimizeDeps: {
		include: ['react', 'react-dom', 'lucide-react', 'motion', '@floating-ui/react', 'shiki'],
	},
})
