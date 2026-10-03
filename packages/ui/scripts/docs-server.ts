/**
 * Serves the docs build the way App Platform serves it, for `docs:preview` and
 * `docs:hydration`.
 *
 * A path gets the file at that path, or `index.html` in the directory at that
 * path. Thus `/stepper` gets `stepper/index.html` with no redirect. Any other
 * path gets `__spa-fallback.html` with status 200, the `catchall_document` of
 * `.do/app.yaml`. `vite preview` does not do this: it gives the home page for
 * `/stepper`.
 *
 * ```sh
 * pnpm --filter ui docs:preview   # http://localhost:3456
 * ```
 */

import { readFile, stat } from 'node:fs/promises'
import { createServer, type Server } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/** The client directory of the docs build. */
const root = path.resolve(import.meta.dirname, '..', 'src', 'docs', 'dist', 'client')

const TYPES: Record<string, string> = {
	'.css': 'text/css',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
}

async function isFile(file: string): Promise<boolean> {
	return (await stat(file).catch(() => null))?.isFile() ?? false
}

/** The file that a path of the site gets. */
async function resolve(pathname: string): Promise<string> {
	const file = path.join(root, decodeURIComponent(pathname))

	// A path that goes out of the build gets the fallback page.
	if (file.startsWith(root)) {
		if (await isFile(file)) return file

		if (await isFile(path.join(file, 'index.html'))) return path.join(file, 'index.html')
	}

	return path.join(root, '__spa-fallback.html')
}

/** Start the server, and give its origin, such as `http://localhost:3456`. */
export async function serveDocs(port: number): Promise<{ origin: string; server: Server }> {
	const server = createServer(async (request, response) => {
		const file = await resolve(new URL(request.url ?? '/', 'http://localhost').pathname)

		const type = TYPES[path.extname(file)] ?? 'application/octet-stream'

		response.writeHead(200, { 'content-type': type }).end(await readFile(file))
	})

	await new Promise<void>((done) => server.listen(port, 'localhost', done))

	return { origin: `http://localhost:${(server.address() as AddressInfo).port}`, server }
}

// Run as a script, not as an import of `docs:hydration`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { origin } = await serveDocs(3456)

	console.log(`The docs build is at ${origin}`)
}
