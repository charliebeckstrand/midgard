/**
 * The server of the docs build: the `docs-server` service of `.do/app.yaml`,
 * and the server of `docs:preview` and `test:docs-build`. `docs:bench` serves
 * the build with the same paths, over HTTP/2.
 *
 * A path gets the file at that path, or `index.html` in the directory at that
 * path. Thus `/stepper` gets `stepper/index.html` with no redirect. Any other
 * path gets `__spa-fallback.html` with status 200. `vite preview` does not do
 * this: it gives the home page for `/stepper`.
 *
 * The build has the HTML of each page in each locale (`src/docs/app/language.ts`).
 * An HTML file goes in the locale of the request: the locale cookie, else the
 * `Accept-Language` header. Thus `/stepper` gets `stepper/index.es.html` for a
 * Spanish reader, at the same path.
 *
 * ```sh
 * pnpm --filter ui docs:preview   # http://localhost:3456
 * ```
 *
 * The service sets `HOST` and `PORT`. It runs the server as one JavaScript
 * file, which `docs:build-server` writes (`vite.docs-server.config.ts`).
 */

import { readFile, stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { localeFile, requestLocale } from '../src/docs/app/language.ts'

/** The client directory of the docs build. */
export const CLIENT_DIR = path.resolve(import.meta.dirname, '..', 'src', 'docs', 'dist', 'client')

/**
 * A browser expression that is `true` when the hydration render gets to the
 * heading, for `test:docs-build` and `docs:bench`. Hydration gives the heading
 * a React fiber. A prerendered heading has none.
 *
 * The expression is `true` before the hydration commits. The client hydrates
 * in a transition, so React renders the page in slices, and the heading of
 * the shell gets its fiber before the content does. Effects run only after the
 * commit. On the bench page, the commit came well after the heading, and no
 * request or long task started between the two. A check that needs the effects
 * of the page must wait for a later signal, such as the full stylesheet that
 * the app links after the commit (`accessibility.test.ts`).
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

/** The HTML file of `file` in `locale`, if the build has one, else `file`. */
async function inLocale(file: string, locale: string): Promise<string> {
	const localized = localeFile(file, locale)

	return localized !== file && (await isFile(localized)) ? localized : file
}

/**
 * The path of a request-target, such as `/button` for `/button?tab=code`, or
 * `undefined` for a target that does not start with `/`, such as `*` or
 * `http://localhost/button`. The server answers such a target with 400.
 *
 * The function does not parse the target as a URL. A URL parse reads the
 * `//button` path as the host `button`, and it throws on a bad host, such as
 * the host of `//[`.
 */
export function targetPathname(target: string): string | undefined {
	return target.startsWith('/') ? target.replace(/[?#].*/s, '') : undefined
}

/**
 * The file that a request-target gets, or `undefined` for a target that has no
 * path (`targetPathname`) or whose path does not decode, such as `/%E0%A4%A`.
 * The server answers such a target with 400. An HTML page goes in `locale`
 * when the build has the page in that locale.
 */
export async function resolveFile(
	root: string,
	target: string,
	locale = 'en',
): Promise<string | undefined> {
	const pathname = targetPathname(target)

	if (pathname === undefined) return undefined

	let decoded: string

	try {
		decoded = decodeURIComponent(pathname)
	} catch {
		return undefined
	}

	const file = path.join(root, decoded)

	// A path that goes out of the build gets the fallback page. The separator
	// keeps out a directory next to the build whose name starts with its name.
	if (file.startsWith(`${root}${path.sep}`)) {
		if (await isFile(file)) return file

		const index = path.join(file, 'index.html')

		if (await isFile(index)) return inLocale(index, locale)
	}

	return inLocale(path.join(root, '__spa-fallback.html'), locale)
}

/** The hashed files of the build, whose names change with their content. */
const ASSETS = `${path.sep}assets${path.sep}`

/**
 * The cache headers of `file`. A hashed file does not change, so a cache keeps
 * it for a year. An HTML file changes with each deploy and with the locale of
 * the request, so a cache asks the server each time.
 */
function cacheHeaders(file: string): Record<string, string> {
	if (file.endsWith('.html')) {
		return { 'cache-control': 'no-cache', vary: 'Cookie, Accept-Language' }
	}

	if (file.includes(ASSETS)) return { 'cache-control': 'public, max-age=31536000, immutable' }

	return { 'cache-control': 'public, max-age=3600' }
}

/** Answer a request with the file of its path. */
async function respond(request: IncomingMessage, response: ServerResponse): Promise<void> {
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		response.writeHead(405, { allow: 'GET, HEAD' }).end()

		return
	}

	const locale = requestLocale({
		cookie: request.headers.cookie,
		acceptLanguage: request.headers['accept-language'],
	})

	const file = await resolveFile(CLIENT_DIR, request.url ?? '/', locale)

	if (file === undefined) {
		response.writeHead(400).end()

		return
	}

	const type = TYPES[path.extname(file)] ?? 'application/octet-stream'

	// A file that the server cannot read gives 500, and the server keeps running.
	const body = await readFile(file).catch(() => undefined)

	if (body === undefined) {
		response.writeHead(500).end()

		return
	}

	response.writeHead(200, {
		'content-type': type,
		'content-length': body.length,
		...cacheHeaders(file),
	})

	response.end(request.method === 'HEAD' ? undefined : body)
}

/**
 * Start the server of the docs build on `host`, and give its origin, such as
 * `http://localhost:3456`.
 */
export async function serveDocs(
	port: number,
	host = 'localhost',
): Promise<{ origin: string; server: Server }> {
	const server = createServer((request, response) => {
		// A response that fails gives 500, and the server keeps running.
		respond(request, response).catch(() => {
			if (!response.headersSent) response.writeHead(500)

			response.end()
		})
	})

	await new Promise<void>((done) => server.listen(port, host, done))

	return { origin: `http://localhost:${(server.address() as AddressInfo).port}`, server }
}

// Run as a script, not as an import of `test:docs-build`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { origin } = await serveDocs(Number(process.env.PORT ?? 3456), process.env.HOST)

	console.log(`The docs build is at ${origin}`)
}
