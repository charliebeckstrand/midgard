/**
 * The server of the docs build: the `ui` service of `.do/app.yaml`,
 * and the server of `docs:preview` and `test:docs-build`. `docs:bench` serves
 * the build with the same paths, over HTTP/2.
 *
 * The root path has no page. It gets a redirect to the first page of the
 * docs, with its query ({@link rootRedirect}). A path gets the file at that
 * path, or `index.html` in the directory at that path. Thus `/stepper` gets
 * `stepper/index.html` with no redirect. Any other path gets
 * `__spa-fallback.html`, the not-found page, with status 404. A missing file,
 * such as a chunk that a deploy removed, gets status 404 too.
 * `vite preview` does not do this: it gives the HTML of the root path for
 * `/stepper`.
 *
 * The build has the HTML of each page in each locale (`src/docs/app/language.ts`).
 * An HTML file goes in the locale of the request: the locale cookie, else the
 * `Accept-Language` header. With a translation of the docs, `/stepper` thus
 * gets `stepper/index.<language>.html` for a reader of that language, at the
 * same path.
 *
 * An HTML file also takes the stored settings of the reader on its root
 * element: the theme, the density, the motion, and the sidebar of the
 * appearance, the events, and the closed sections of the sidebar of the docs. The cookies of the request hold them
 * ({@link rootMarks}). Thus the first paint shows the settings with no script.
 *
 * ```sh
 * pnpm --filter ui docs:preview   # http://localhost:3456
 * ```
 *
 * A text file, such as HTML, a script, or a stylesheet, goes compressed with
 * brotli, or with gzip for a client that takes no brotli ({@link pickEncoding}).
 * The server compresses each file one time, and keeps the result in memory.
 * Each file that is found has an entity tag, so a client that has a current
 * copy gets 304 and no body ({@link isFresh}).
 *
 * The service sets `HOST` and `PORT`. It runs the server as one JavaScript
 * file, which `docs:build-server` writes (`src/docs/vite.docs-server.config.ts`).
 */

import { stat } from 'node:fs/promises'
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { requestLocale } from '../../src/docs/app/language.ts'
import { rootRedirect } from '../../src/docs/app/root-redirect.ts'
import { sectionRootClasses } from '../../src/docs/app/section-marks.ts'
import { type RootMarks, rootMarks } from '../../src/server/root-marks.ts'
import {
	CLIENT_DIR,
	COMPRESSED,
	contentType,
	isFallback,
	listen,
	marksKey,
	NO_MARKS,
	pickEncoding,
	readBody,
	resolveFile,
} from './build.ts'

/**
 * The marks of the root element for `cookies`: the marks of `ui`, and a class
 * for each closed section of the sidebar ({@link sectionRootClasses}).
 */
function docsMarks(cookies?: string): RootMarks {
	const { classes, attributes } = rootMarks(cookies)

	return { classes: [...classes, ...sectionRootClasses(cookies)], attributes }
}

/** The hashed files of the build, whose names change with their content. */
const ASSETS = `${path.sep}assets${path.sep}`

/**
 * The cache headers of `file`. A hashed file does not change, so a cache keeps
 * it for a year. An HTML file changes with each deploy and with the locale of
 * the request, so a cache asks the server each time. A file that the server
 * compresses also changes with the codings that the request takes.
 */
function cacheHeaders(file: string): Record<string, string> {
	const html = file.endsWith('.html')

	let control = 'public, max-age=3600'

	if (html) control = 'no-cache'
	else if (file.includes(ASSETS)) control = 'public, max-age=31536000, immutable'

	const vary = [
		...(html ? ['Cookie', 'Accept-Language'] : []),
		...(COMPRESSED.has(path.extname(file)) ? ['Accept-Encoding'] : []),
	]

	return vary.length > 0
		? { 'cache-control': control, vary: vary.join(', ') }
		: { 'cache-control': control }
}

/**
 * The validator of `file`: a weak entity tag from the size and the time of the
 * file, and the key of the marks on the root of an HTML file. Each body of the
 * file, in each coding, is the same content, so one weak tag covers all of
 * them. A new build writes the file again, which changes the tag. A change of
 * the settings of the reader changes the marks, and thus the tag.
 */
export function entityTag(
	{ size, mtimeMs }: { size: number; mtimeMs: number },
	marks: RootMarks = NO_MARKS,
): string {
	const key = marksKey(marks)

	return `W/"${size.toString(16)}-${Math.trunc(mtimeMs).toString(16)}${key ? `-${key}` : ''}"`
}

/**
 * Whether the copy that a client has is current: its `If-None-Match` header
 * names `etag`, or is `*`. The comparison is weak, so `W/` does not count.
 */
export function isFresh(ifNoneMatch: string | undefined, etag: string): boolean {
	if (!ifNoneMatch) return false

	const opaque = (tag: string) => tag.trim().replace(/^W\//, '')

	return ifNoneMatch.split(',').some((tag) => tag.trim() === '*' || opaque(tag) === opaque(etag))
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

	const marks = file?.endsWith('.html') ? docsMarks(request.headers.cookie) : NO_MARKS

	if (file === undefined) {
		response.writeHead(400).end()

		return
	}

	const type = contentType(file)

	const missing = isFallback(file)

	// A file that the server cannot read gives 500, and the server keeps running.
	const stats = await stat(file).catch(() => undefined)

	if (stats === undefined) {
		response.writeHead(500).end()

		return
	}

	// A file that the client has a current copy of gets 304 and no body, so a
	// reload of a page does not download the page again. The not-found page
	// has no validator.
	const etag = missing ? undefined : entityTag(stats, marks)

	if (etag !== undefined && isFresh(request.headers['if-none-match'], etag)) {
		response.writeHead(304, { etag, ...cacheHeaders(file) }).end()

		return
	}

	const encoding = pickEncoding(file, request.headers['accept-encoding'])

	const body = await readBody(file, encoding, marks).catch(() => undefined)

	if (body === undefined) {
		response.writeHead(500).end()

		return
	}

	response.writeHead(missing ? 404 : 200, {
		'content-type': type,
		'content-length': body.length,
		...(etag && { etag }),
		...(encoding && { 'content-encoding': encoding }),
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
		// The root path has no file. The redirect is temporary, so a browser does
		// not keep it if the root path gets a page again.
		const location = rootRedirect(request.url ?? '/')

		if (location !== undefined) {
			response.writeHead(302, { location }).end()

			return
		}

		// A response that fails gives 500, and the server keeps running.
		respond(request, response).catch(() => {
			if (!response.headersSent) response.writeHead(500)

			response.end()
		})
	})

	return { origin: `http://localhost:${await listen(server, port, host)}`, server }
}

// Run as a script, not as an import of `test:docs-build`.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	const { origin } = await serveDocs(Number(process.env.PORT ?? 3456), process.env.HOST)

	console.log(`The docs build is at ${origin}`)
}
