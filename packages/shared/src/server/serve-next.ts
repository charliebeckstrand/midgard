import { readFileSync } from 'node:fs'
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { createRequire } from 'node:module'
import path from 'node:path'
import { readServerEnv, writeNextEnv } from './env'
import { markHtml } from './mark-html'

// The server of a Next app in its image, in place of the `server.js` of the
// standalone output. It runs Next through the custom-server API, and it puts
// two layers in front of the handler of Next:
//
//   1. Compression, as Next does with `compress`. The `compress` setting of
//      Next is off, so the layer below reads plain HTML.
//   2. `markHtml`, which writes the stored settings of the reader on the root
//      element of each HTML page. Thus the first paint shows the theme, the
//      density, the motion, the sidebar, and the events of the reader, with
//      no script before the paint (CONVENTIONS §3.13). The static shell of a
//      route stays the same for each reader, so Cache Components keeps it.
//
// The Dockerfile copies the bundle of this file (`dist/serve-next.js`) beside
// the `server.js` of the app, and runs it. `next` resolves from the
// `node_modules` of the standalone output.

/** The type of the compression middleware that Next bundles. */
type Middleware = (request: IncomingMessage, response: ServerResponse, next: () => void) => void

/** The custom-server API of Next, as this server uses it. */
type NextServer = {
	prepare: () => Promise<void>
	getRequestHandler: () => (request: IncomingMessage, response: ServerResponse) => Promise<void>
}

type NextFactory = (options: {
	dev: boolean
	dir: string
	conf: Record<string, unknown>
	hostname: string
	port: number
}) => NextServer

/**
 * Starts the server of the Next app whose standalone folder is `dir`, on
 * `PORT` and `HOSTNAME`, as the `server.js` of Next does.
 */
export async function serveNext(dir: string): Promise<void> {
	const require = createRequire(path.join(dir, 'server.js'))

	process.chdir(dir)

	const { port, hostname, keepAliveTimeout } = readServerEnv()

	const { config } = JSON.parse(
		readFileSync(path.join(dir, '.next', 'required-server-files.json'), 'utf8'),
	) as {
		config: Record<string, unknown>
	}

	// The compression layer below compresses each response. Next must not, or
	// the HTML reaches `markHtml` compressed.
	const conf = { ...config, compress: false }

	writeNextEnv(conf)

	const next = require('next') as NextFactory

	const compression = require('next/dist/compiled/compression') as () => Middleware

	const app = next({ dev: false, dir, conf, hostname, port })

	await app.prepare()

	const handle = app.getRequestHandler()

	const compress = compression()

	const server = createServer((request, response) => {
		compress(request, response, () => {
			markHtml(request, response)

			void handle(request, response)
		})
	})

	if (keepAliveTimeout !== undefined) server.keepAliveTimeout = keepAliveTimeout

	server.listen(port, hostname, () => {
		console.log(`Ready on http://${hostname}:${port}`)
	})
}
