/**
 * The files of the docs build, and how a server of the build serves them:
 * the file of a request-target, its content type, its content coding, and its
 * body. The docs server (`server.ts`), `docs:bench`, and `docs:parity` serve
 * the build with these rules, and `test:docs-build` reads the build with them.
 */

import { globSync } from 'node:fs'
import { readFile, stat } from 'node:fs/promises'
import type { AddressInfo, Server } from 'node:net'
import path from 'node:path'
import { promisify } from 'node:util'
import { brotliCompress, constants, gzip } from 'node:zlib'
import { localeFile } from '../../src/docs/app/language.ts'
import { markRoot, type RootMarks, rootMarks } from '../../src/server/root-marks.ts'
import { getOrCompute } from '../../src/utilities/get-or-compute.ts'

const brotli = promisify(brotliCompress)

const gzipAsync = promisify(gzip)

/** The client directory of the docs build. */
export const CLIENT_DIR = path.resolve(import.meta.dirname, '..', '..', 'dist', 'docs', 'client')

/**
 * The path of each prerendered page in the client directory `root`, in order,
 * such as `/` and `/button`.
 */
export function prerenderedPages(root = CLIENT_DIR): string[] {
	return globSync('**/index.html', { cwd: root })
		.map((file) => `/${file.replace(/\/?index\.html$/, '')}`)
		.sort()
}

/** The content type of each kind of file in a build. */
const TYPES: Record<string, string> = {
	'.css': 'text/css',
	'.html': 'text/html; charset=utf-8',
	'.js': 'text/javascript',
	'.json': 'application/json',
	'.pdf': 'application/pdf',
	'.svg': 'image/svg+xml',
	'.woff2': 'font/woff2',
}

/** The content type of `file`, from its extension. An unknown kind is binary data. */
export const contentType = (file: string): string =>
	TYPES[path.extname(file)] ?? 'application/octet-stream'

/**
 * The kinds of file that a server of the build compresses. The other kinds in a build,
 * such as a font or a PDF file, are compressed in their own format.
 */
export const COMPRESSED = new Set(['.css', '.html', '.js', '.json', '.svg'])

/** The content codings of the server, in the order that it prefers them. */
const ENCODINGS = ['br', 'gzip'] as const

/** A content coding of the server. */
export type Encoding = (typeof ENCODINGS)[number]

/**
 * The content coding of `file` for a request whose `Accept-Encoding` header is
 * `header`: brotli when the client takes it, else gzip, else none. A file that
 * the server does not compress has none. A coding with the weight `q=0` is
 * not taken, and `*` gives its weight to each coding that the header does not
 * name.
 */
export function pickEncoding(file: string, header: string | undefined): Encoding | undefined {
	if (!header || !COMPRESSED.has(path.extname(file))) return undefined

	const weights = new Map(
		header.split(',').map((part) => {
			const [coding = '', ...params] = part.split(';').map((piece) => piece.trim())

			const weight = params.find((param) => param.startsWith('q='))

			return [coding.toLowerCase(), weight ? Number(weight.slice(2)) : 1]
		}),
	)

	return ENCODINGS.find((coding) => (weights.get(coding) ?? weights.get('*') ?? 0) > 0)
}

/** A key that names `marks`: empty with no marks. */
export function marksKey({ classes, attributes }: RootMarks): string {
	return [...classes, ...attributes].join('+')
}

/** The compressed bodies, by coding, file, the time and size of the file, and the marks of the root. */
const bodies = new Map<string, Promise<Buffer>>()

/** The content of `file`, with `marks` on the root element of an HTML file. */
async function readContent(file: string, marks: RootMarks): Promise<Buffer> {
	const data = await readFile(file)

	return file.endsWith('.html') && marksKey(marks) !== ''
		? Buffer.from(markRoot(data.toString('utf8'), marks))
		: data
}

/** No marks on the root element. */
export const NO_MARKS = rootMarks()

/**
 * The body of `file` in `encoding`, or as it is on the disk with no coding,
 * with `marks` on the root element of an HTML file ({@link markRoot}). The
 * server compresses a file one time for each set of marks, as a CDN keeps the
 * compressed file. The key holds the time and the size of the file, so a new
 * build at the same path gets new bodies. A compression that fails is not kept.
 */
export async function readBody(
	file: string,
	encoding?: Encoding,
	marks: RootMarks = NO_MARKS,
): Promise<Buffer> {
	if (encoding === undefined) return readContent(file, marks)

	const { mtimeMs, size } = await stat(file)

	const key = `${encoding}:${file}:${mtimeMs}:${size}:${file.endsWith('.html') ? marksKey(marks) : ''}`

	const body = getOrCompute(bodies, key, () =>
		readContent(file, marks).then((data) =>
			encoding === 'br'
				? brotli(data, { params: { [constants.BROTLI_PARAM_QUALITY]: 9 } })
				: gzipAsync(data, { level: 9 }),
		),
	)

	body.catch(() => bodies.delete(key))

	return body
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

/** The fallback document of the build: the not-found page, for a path with no file and no page. */
const FALLBACK = '__spa-fallback.html'

/** Whether `file` is the fallback document in a locale, such as `__spa-fallback.es.html`. */
export function isFallback(file: string): boolean {
	return /^__spa-fallback(?:\.[\w-]+)?\.html$/.test(path.basename(file))
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

	return inLocale(path.join(root, FALLBACK), locale)
}

/** Starts `server` on `port` of `host`, and gives its port. Port 0 gives a free port. */
export async function listen(server: Server, port: number, host: string): Promise<number> {
	await new Promise<void>((done) => server.listen(port, host, done))

	return (server.address() as AddressInfo).port
}
