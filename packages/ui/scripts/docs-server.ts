/**
 * Serves the docs build the way App Platform serves it, for `docs:preview` and
 * `test:docs-build`. `docs:bench` serves the build with the same paths, over
 * HTTP/2.
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
export const CLIENT_DIR = path.resolve(import.meta.dirname, '..', 'src', 'docs', 'dist', 'client')

/**
 * A browser expression that is `true` when the page hydrated, for
 * `test:docs-build` and `docs:bench`. Hydration gives the heading a React
 * fiber. A prerendered heading has none.
 */
export const HYDRATED = `Object.keys(document.querySelector('h1') ?? {}).some((key) => key.startsWith('__reactFiber'))`

/** The content type of each kind of file in a build. */
export const TYPES: Record<string, string> = {
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

/**
 * The file that a path of the site gets, or `undefined` for a path that does
 * not decode, such as `/%E0%A4%A`. The server answers such a path with 400.
 */
export async function fileOf(root: string, pathname: string): Promise<string | undefined> {
	let decoded: string

	try {
		decoded = decodeURIComponent(pathname)
	} catch {
		return undefined
	}

	const file = path.join(root, decoded)

	// A path that goes out of the build gets the fallback page.
	if (file.startsWith(root)) {
		if (await isFile(file)) return file

		if (await isFile(path.join(file, 'index.html'))) return path.join(file, 'index.html')
	}

	return path.join(root, '__spa-fallback.html')
}

/** Start the server of the docs build, and give its origin, such as `http://localhost:3456`. */
export async function serveDocs(port: number): Promise<{ origin: string; server: Server }> {
	const server = createServer(async (request, response) => {
		const file = await fileOf(CLIENT_DIR, new URL(request.url ?? '/', 'http://localhost').pathname)

		if (file === undefined) {
			response.writeHead(400).end()

			return
		}

		const type = TYPES[path.extname(file)] ?? 'application/octet-stream'

		response.writeHead(200, { 'content-type': type }).end(await readFile(file))
	})

	await new Promise<void>((done) => server.listen(port, 'localhost', done))

	return { origin: `http://localhost:${(server.address() as AddressInfo).port}`, server }
}

// Run as a script, not as an import of `test:docs-build`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { origin } = await serveDocs(3456)

	console.log(`The docs build is at ${origin}`)
}
