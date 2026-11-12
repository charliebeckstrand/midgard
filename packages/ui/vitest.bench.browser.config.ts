import { playwright } from '@vitest/browser-playwright'
import type { Plugin } from 'vite'
import { defineConfig } from 'vitest/config'
import type { BrowserCommand } from 'vitest/node'
import { servedTailwind } from './vitest.browser.config.ts'

const watched = new WeakSet<object>()

// Temporary diagnostic: log what happens to the page and the browser.
const diagWatch: BrowserCommand<[]> = async (context) => {
	const page = context.page
	if (watched.has(page)) return
	watched.add(page)
	const log = (text: string) => console.error(`[diag] ${new Date().toISOString()} ${text}`)
	page.on('crash', () => log('page crash'))
	page.on('close', () => log('page close'))
	page.on('pageerror', (error) => log(`page error ${error.message}`))
	page.on('framenavigated', (frame) =>
		log(
			`frame navigated ${frame === page.mainFrame() ? 'main' : 'child'} ${frame.url().slice(0, 80)}`,
		),
	)
	page.on('console', (message) => {
		const text = message.text()
		if (text.includes('[diag-ws]') || text.includes('WebSocket') || message.type() === 'error')
			log(`console ${message.type()} ${text.slice(0, 600)}`)
	})
	await page.addInitScript(() => {
		const Native = window.WebSocket
		const close = Native.prototype.close
		const name = (socket: WebSocket) => socket.url.split('?')[0]
		Native.prototype.close = function (this: WebSocket, ...args: [number?, string?]) {
			console.log(`[diag-ws] close() ${name(this)} ${args.join(' ')} ${new Error().stack}`)
			return close.apply(this, args)
		}
		class Wrapped extends Native {
			constructor(url: string | URL, protocols?: string | string[]) {
				super(url, protocols)
				this.addEventListener('error', () => console.log(`[diag-ws] error event ${name(this)}`))
				this.addEventListener('close', (event) =>
					console.log(
						`[diag-ws] close event ${name(this)} code=${event.code} clean=${event.wasClean} reason=${event.reason}`,
					),
				)
			}
		}
		window.WebSocket = Wrapped
		console.log(`[diag-ws] installed in ${location.href.slice(0, 60)}`)
	})
	page.context().on('page', () => log('new page'))
	page
		.context()
		.browser()
		?.on('disconnected', () => log('browser disconnected'))
	log('watching the page')
}

// Temporary diagnostic: log how each upgraded socket of the server closes.
function logSockets(): Plugin {
	return {
		name: 'diag:log-sockets',
		configureServer(server) {
			server.httpServer?.on('upgrade', (request, socket) => {
				const query = new URL(request.url ?? '/', 'http://localhost')
				const url = `${query.pathname} ${query.searchParams.get('type') ?? 'hmr'}`
				const opened = Date.now()
				socket.on('data', (chunk: Buffer) => {
					if (chunk.length < 8 || (chunk.readUInt8(0) & 0x0f) !== 8) return
					if ((chunk.readUInt8(1) & 0x7f) < 2) return
					const code = chunk.readUInt16BE(6) ^ chunk.readUInt16BE(2)
					console.error(`[diag] ${new Date().toISOString()} close frame ${code} ${url}`)
				})
				socket.on('end', () =>
					console.error(`[diag] ${new Date().toISOString()} end (peer FIN) ${url}`),
				)
				socket.on('error', (error: Error) =>
					console.error(`[diag] ${new Date().toISOString()} error ${error.message} ${url}`),
				)
				socket.on('close', (hadError: boolean) =>
					console.error(
						`[diag] ${new Date().toISOString()} close hadError=${hadError} after ${Date.now() - opened}ms ${url} rss=${process.memoryUsage().rss}`,
					),
				)
			})
		},
	}
}

/**
 * The benchmarks of the ui modules in real Chromium (`pnpm bench:browser`),
 * per `src/__benchmarks__/browser/README.md`. The grids virtualize against
 * real scroll geometry, and the charts and maps settle against real layout
 * and style, so jsdom numbers would not be credible.
 *
 * Chromium launches with the frame-rate limit off: the hover benches settle
 * one frame per iteration, so a vsync'd browser would quantize every such
 * sample to ~16ms.
 */
export default defineConfig({
	plugins: [servedTailwind(), ...(process.env.BENCH_NETLOG ? [logSockets()] : [])],
	// Measure the React the module actually ships: production, not the
	// development build Vite serves by default. The dev build's invariant checks
	// and warnings run several times the work per render, so a dev-React number
	// would score the module's diagnostics, not its shipped speed. Defined at
	// both layers because React selects its build through a
	// `process.env.NODE_ENV` require that both the app transform and the
	// dependency pre-bundle must fold to `'production'`.
	define: { 'process.env.NODE_ENV': '"production"' },
	// The production build of React has no `jsxDEV`, and the define does not
	// change the mode of Vite. So the JSX of the app compiles for the production
	// runtime too.
	oxc: { jsx: { development: false } },
	// Pre-bundle the bench dependency set so the optimizer doesn't discover it
	// lazily and reload the page mid-run (see vitest.browser.config.ts).
	optimizeDeps: {
		rolldownOptions: { transform: { define: { 'process.env.NODE_ENV': '"production"' } } },
		include: [
			'@floating-ui/react',
			'@internationalized/date',
			'd3-geo',
			'lucide-react',
			'motion',
			'motion/react',
			'motion/react-m',
			'pdfjs-dist',
			'pdfjs-dist/legacy/build/pdf.mjs',
			'react',
			// The JSX of the benches compiles for the production runtime (`oxc`
			// above). The scan starts from no test file here, so without this entry a
			// cold cache finds the runtime at the first import and reloads the page.
			'react/jsx-runtime',
			'react-dom',
			'react-dom/client',
			'tinykeys',
			'topojson-client',
		],
	},
	test: {
		globals: true,
		include: [],
		setupFiles: ['./src/__benchmarks__/browser/setup.ts'],
		benchmark: {
			include: ['src/__benchmarks__/browser/**/*.bench.{ts,tsx}'],
		},
		browser: {
			enabled: true,
			provider: playwright({
				launchOptions: {
					...(process.env.BENCH_EXECUTABLE ? { executablePath: process.env.BENCH_EXECUTABLE } : {}),
					args: [
						'--disable-frame-rate-limit',
						'--disable-gpu-vsync',
						...(process.env.BENCH_NETLOG ? [`--log-net-log=${process.env.BENCH_NETLOG}`] : []),
					],
				},
			}),
			headless: true,
			commands: { diagWatch },
			screenshotFailures: false,
			instances: [{ browser: 'chromium' }],
		},
	},
})
