import { describe, expect, it, vi } from 'vitest'
import { postReport } from '../../modules/events/engine/events-post'
import type { EventReportExport } from '../../modules/events/engine/types'
import { ReportExportError, readReportExport } from '../../server/report-export'

// The browser posts a report with `postReport`, and the server of the app
// reads it with `readReportExport`.

/** A report as `createReportExport` gives it. */
function makeExport(): EventReportExport {
	return {
		title: 'caught boom ×2',
		text: '## caught boom ×2',
		report: {
			hash: '3f9a0c1',
			origin: 'caught',
			stack: ['Error: boom', '    at render (app.js:1:1)'],
			componentStack: ['at Page'],
			route: '/places/:id',
			count: 2,
			at: '2026-11-21T02:37:32.865Z',
			page: '/places/1',
			build: 'events-report-abc123.js',
			device: 'Mozilla/5.0, dpr 2, fine pointer',
			root: 'lang="en" data-events',
			viewport: {
				visual: { height: 720, offsetTop: 0 },
				window: 720,
				svh: 720,
				dvh: 720,
				lvh: 720,
				safe: { top: 0, bottom: 0 },
				y: 0,
			},
			focus: 'button[button] at 0,0 10x10',
			trail: ['   120 y0     input   keydown *** input=*** synthetic'],
		},
	}
}

/** A request that posts `body`. */
function makeRequest(body: BodyInit, headers?: HeadersInit): Request {
	return new Request('https://app.test/api/report', { method: 'POST', body, headers })
}

/** Replaces `fetch` for the test, and returns the requests that it got. */
function stubFetch(status = 204): Request[] {
	const requests: Request[] = []

	const fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
		requests.push(new Request(new URL(String(input), 'https://app.test'), init))

		return new Response(null, { status })
	})

	vi.stubGlobal('fetch', fetch)

	return requests
}

describe('postReport', () => {
	it('posts the report as JSON with the headers of the app, and the server reads the same report', async () => {
		const requests = stubFetch()

		const sent = makeExport()

		await postReport('/api/report', { headers: { 'x-csrf-token': 'abc' } })(sent)

		const request = requests[0]

		expect(request?.method).toBe('POST')

		expect(request?.url).toBe('https://app.test/api/report')

		expect(request?.headers.get('content-type')).toBe('application/json')

		expect(request?.headers.get('x-csrf-token')).toBe('abc')

		await expect(readReportExport(request ?? makeRequest(''))).resolves.toEqual(sent)
	})

	it('rejects when the endpoint does not answer 2xx, so the view shows Send failed', async () => {
		stubFetch(502)

		await expect(postReport('/api/report')(makeExport())).rejects.toThrow(
			'The report endpoint answered 502',
		)
	})
})

describe('readReportExport', () => {
	it('keeps only the known fields of a report', async () => {
		const sent = makeExport()

		const body = JSON.stringify({
			...sent,
			secret: 'x',
			report: {
				...sent.report,
				cookie: 'session=1',
				viewport: { ...sent.report.viewport, extra: 1 },
			},
		})

		const read = await readReportExport(makeRequest(body))

		expect(read).toEqual(sent)

		expect(JSON.stringify(read)).not.toMatch(/secret|cookie|extra/)
	})

	it('keeps an optional field absent when the report has none', async () => {
		const { route: _route, focus: _focus, ...report } = makeExport().report

		const read = await readReportExport(makeRequest(JSON.stringify({ ...makeExport(), report })))

		expect('route' in read.report).toBe(false)

		expect('focus' in read.report).toBe(false)
	})

	it.each([
		['not JSON', '{', 'The report is not JSON'],
		['an array', '[]', 'The report has no valid body'],
		['no title', JSON.stringify({ ...makeExport(), title: 1 }), 'The report has no valid title'],
		[
			'an unknown origin',
			JSON.stringify({ ...makeExport(), report: { ...makeExport().report, origin: 'guess' } }),
			'The report has no valid report.origin',
		],
		[
			'a trail that is not lines',
			JSON.stringify({ ...makeExport(), report: { ...makeExport().report, trail: [1] } }),
			'The report has no valid report.trail',
		],
		[
			'a count that is not a number',
			JSON.stringify({ ...makeExport(), report: { ...makeExport().report, count: Number.NaN } }),
			'The report has no valid report.count',
		],
	])('fails with 400 for %s', async (_name, body, message) => {
		const error = await readReportExport(makeRequest(body)).catch((caught: unknown) => caught)

		expect(error).toBeInstanceOf(ReportExportError)

		expect(error).toMatchObject({ status: 400, message })
	})

	it('fails with 413 from the Content-Length, or when the body passes the limit', async () => {
		const body = JSON.stringify(makeExport())

		await expect(
			readReportExport(makeRequest(body, { 'content-length': '2000000' })),
		).rejects.toMatchObject({ status: 413 })

		// A request with no Content-Length header passes the limit in its body.
		expect(makeRequest(body).headers.has('content-length')).toBe(false)

		await expect(readReportExport(makeRequest(body), { maxBytes: 100 })).rejects.toMatchObject({
			status: 413,
		})

		await expect(
			readReportExport(makeRequest(body), { maxBytes: new TextEncoder().encode(body).byteLength }),
		).resolves.toEqual(makeExport())
	})
})
