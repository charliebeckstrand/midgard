import type { IncomingMessage, OutgoingHttpHeaders, ServerResponse } from 'node:http'
import { hasRootTag, markRoot, type RootMarks, rootMarks } from 'ui/server'

// The marks of the root element come from the cookies of the request, so an
// HTML response is not the same for each reader. A cache must not give the
// response of one reader to another, and a validator must not answer 304 for
// a page whose marks changed.

/** Whether a response with `type` and `encoding` is HTML that the layer can read. */
function isPlainHtml(type: unknown, encoding: unknown): boolean {
	return String(type ?? '').startsWith('text/html') && encoding === undefined
}

/** Adds `Cookie` to the `Vary` header of `response`, after the values that it has. */
function varyOnCookie(response: ServerResponse): void {
	const vary = response.getHeader('vary')

	const values = vary === undefined ? [] : String(vary).split(/\s*,\s*/)

	if (!values.some((value) => value.toLowerCase() === 'cookie')) {
		response.setHeader('vary', [...values, 'Cookie'].join(', '))
	}
}

/**
 * Makes the HTML response of `response` private to the reader: a shared cache does
 * not keep it, no validator answers 304 for it, and its length can change.
 */
function makePrivate(response: ServerResponse): void {
	response.removeHeader('content-length')

	response.removeHeader('etag')

	const control = String(response.getHeader('cache-control') ?? '')

	if (!/\b(?:private|no-store)\b/.test(control))
		response.setHeader('cache-control', 'private, no-cache')

	varyOnCookie(response)
}

/** The bytes of a chunk that a response writes. */
function toBuffer(chunk: unknown, encoding?: BufferEncoding): Buffer {
	if (typeof chunk === 'string') return Buffer.from(chunk, encoding)

	return Buffer.from(chunk as Uint8Array)
}

/**
 * The arguments of `writeHead` with the headers of an object argument copied
 * onto `response`, so {@link makePrivate} sees them.
 */
function takeHeaders(response: ServerResponse, args: unknown[]): unknown[] {
	return args.filter((arg) => {
		if (typeof arg !== 'object' || arg === null || Array.isArray(arg)) return true

		for (const [name, value] of Object.entries(arg as OutgoingHttpHeaders)) {
			if (value !== undefined) response.setHeader(name, value)
		}

		return false
	})
}

/**
 * Writes the stored settings of the reader on the root element of each HTML
 * response of `response` ({@link rootMarks}, {@link markRoot}). Call it before the
 * handler of the framework writes to `response`.
 *
 * The layer holds the start of the page until the opening tag of the root
 * element is whole, marks it, and sends the rest of the page as it streams.
 * It reads the bytes as `latin1`, so the other text keeps its bytes. A
 * response that is not HTML, or that is compressed already, passes as it is.
 * Thus a compression layer must wrap this one, so it compresses the marked
 * page.
 */
export function markHtml(request: IncomingMessage, response: ServerResponse): void {
	const marks: RootMarks = rootMarks(request.headers.cookie)

	const writeHead = response.writeHead.bind(response) as (...args: unknown[]) => ServerResponse

	const write = response.write.bind(response) as (...args: unknown[]) => boolean

	const end = response.end.bind(response) as (...args: unknown[]) => ServerResponse

	// `undefined` until the headers go: then whether the response is HTML.
	let html: boolean | undefined

	// The start of the page, held until the root tag is whole. `null` once it is sent.
	let head: Buffer | null = Buffer.alloc(0)

	const decide = () => {
		if (html !== undefined) return

		html = isPlainHtml(response.getHeader('content-type'), response.getHeader('content-encoding'))

		if (html) makePrivate(response)
	}

	const flush = () => {
		const page = head ?? Buffer.alloc(0)

		head = null

		return Buffer.from(markRoot(page.toString('latin1'), marks), 'latin1')
	}

	response.writeHead = ((...args: unknown[]) => {
		const rest = takeHeaders(response, args)

		decide()

		return writeHead(...rest)
	}) as ServerResponse['writeHead']

	response.write = ((chunk: unknown, ...rest: unknown[]) => {
		decide()

		if (!html || head === null) return write(chunk, ...rest)

		const encoding = typeof rest[0] === 'string' ? (rest[0] as BufferEncoding) : undefined

		head = Buffer.concat([head, toBuffer(chunk, encoding)])

		if (!hasRootTag(head.toString('latin1'))) return true

		return write(flush(), ...rest.filter((arg) => typeof arg === 'function'))
	}) as ServerResponse['write']

	response.end = ((chunk?: unknown, ...rest: unknown[]) => {
		decide()

		if (!html || head === null) return end(chunk, ...rest)

		const encoding = typeof rest[0] === 'string' ? (rest[0] as BufferEncoding) : undefined

		if (chunk !== undefined && chunk !== null && typeof chunk !== 'function') {
			head = Buffer.concat([head, toBuffer(chunk, encoding)])
		}

		const callback = [chunk, ...rest].find((arg) => typeof arg === 'function')

		return callback ? end(flush(), callback) : end(flush())
	}) as ServerResponse['end']
}
