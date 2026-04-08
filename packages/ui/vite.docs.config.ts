import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
	base: '/',
	root: 'src/docs',
	plugins: [react(), tailwindcss()],
	server: { port: 3456 },
})
