// @vitest-environment node
import { createServer, get, type IncomingHttpHeaders, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { afterEach, describe, expect, it } from 'vitest'
import { markHtml } from '../server/mark-html'

const COOKIE = 'theme=dark; events-on=1'

let close: (() => void) | undefined

afterEach(() => close?.())

/**
 * Serves one response through `markHtml`, which `handler` writes, and reads it
 * with the `Cookie` header `cookie`.
 */
async function serve(
	handler: (response: ServerResponse) => void,
	cookie = COOKIE,
): Promise<{ headers: IncomingHttpHeaders; body: string }> {
	const server = createServer((request, response) => {
		markHtml(request, response)

		handler(response)
	})

	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

	close = () => server.close()

	const { port } = server.address() as AddressInfo

	return new Promise((resolve, reject) => {
		get({ port, host: '127.0.0.1', headers: { cookie } }, (reply) => {
			const chunks: Buffer[] = []

			reply.on('data', (chunk: Buffer) => chunks.push(chunk))

			reply.on('end', () =>
				resolve({ headers: reply.headers, body: Buffer.concat(chunks).toString() }),
			)
		}).on('error', reject)
	})
}

const PAGE = '<!DOCTYPE html><html lang="en"><head></head><body>Café</body></html>'

const MARKED =
	'<!DOCTYPE html><html lang="en" class="dark" data-events=""><head></head><body>Café</body></html>'

describe('markHtml', () => {
	it('marks the root of a page that the handler ends in one chunk', async () => {
		const { body } = await serve((response) => {
			response.setHeader('content-type', 'text/html; charset=utf-8')

			response.end(PAGE)
		})

		expect(body).toBe(MARKED)
	})

	it('marks a root tag that streams across chunks, and keeps the bytes of the text', async () => {
		const bytes = Buffer.from(PAGE)

		const { body } = await serve((response) => {
			response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' })

			// Splits the root tag, and the two bytes of `é`.
			response.write(bytes.subarray(0, 20))

			response.write(new Uint8Array(bytes.subarray(20, bytes.length - 15)))

			response.end(bytes.subarray(bytes.length - 15))
		})

		expect(body).toBe(MARKED)
	})

	it('makes a page private to the reader', async () => {
		const { headers } = await serve((response) => {
			response.writeHead(200, {
				'content-type': 'text/html',
				'content-length': Buffer.byteLength(PAGE),
				'cache-control': 's-maxage=31536000',
				etag: '"abc"',
				vary: 'RSC, Accept-Encoding',
			})

			response.end(PAGE)
		})

		expect(headers['cache-control']).toBe('private, no-cache')

		expect(headers.etag).toBeUndefined()

		expect(headers.vary).toBe('RSC, Accept-Encoding, Cookie')
	})

	it('keeps a cache control that is private already', async () => {
		const { headers } = await serve((response) => {
			response.setHeader('content-type', 'text/html')

			response.setHeader('cache-control', 'private, no-cache, no-store, max-age=0, must-revalidate')

			response.end(PAGE)
		})

		expect(headers['cache-control']).toBe('private, no-cache, no-store, max-age=0, must-revalidate')
	})

	it('passes a response that is not HTML, or that is compressed, as it is', async () => {
		const json = await serve((response) => {
			response.writeHead(200, { 'content-type': 'application/json', etag: '"abc"' })

			response.end('{"html":"<html>"}')
		})

		expect(json.body).toBe('{"html":"<html>"}')

		expect(json.headers.etag).toBe('"abc"')

		const encoded = await serve((response) => {
			response.writeHead(200, { 'content-type': 'text/html', 'content-encoding': 'identity' })

			response.end(PAGE)
		})

		expect(encoded.body).toBe(PAGE)
	})

	it('sends the page as it is with no cookies', async () => {
		const { body } = await serve((response) => {
			response.setHeader('content-type', 'text/html')

			response.end(PAGE)
		}, '')

		expect(body).toBe(PAGE)
	})
})
