import type { EventReport, EventReportExport, EventViewport } from '../modules/events/engine/types'

// The server end of `postReport`: it reads the report that the browser posts,
// and checks it. The body comes from the browser, so the server does not trust
// it. The reader keeps only the known fields, so a client cannot add data that
// goes on to the tracker.

/** The largest body that the reader takes by default, in bytes. A capture of 2,000 lines fits. */
const MAX_BYTES = 1024 * 1024

/** The channels of a report. */
const ORIGINS = new Set<EventReport['origin']>([
	'uncaught',
	'caught',
	'recoverable',
	'route',
	'window',
	'capture',
])

/** Options of {@link readReportExport}. */
export type ReadReportOptions = {
	/**
	 * The largest body that the reader takes, in bytes. A larger body fails with 413.
	 *
	 * @defaultValue 1048576
	 */
	maxBytes?: number
}

/**
 * The error of a body that {@link readReportExport} does not take. Its
 * `status` is the status of the response to send: 400 for a body that is not
 * a report, and 413 for a body that is too large.
 */
export class ReportExportError extends Error {
	readonly status: 400 | 413

	constructor(message: string, status: 400 | 413) {
		super(message)

		this.name = 'ReportExportError'

		this.status = status
	}
}

/** Fails with 400. */
function reject(field: string): never {
	throw new ReportExportError(`The report has no valid ${field}`, 400)
}

function readString(value: unknown, field: string): string {
	return typeof value === 'string' ? value : reject(field)
}

function readOptionalString(value: unknown, field: string): string | undefined {
	return value === undefined ? undefined : readString(value, field)
}

function readNumber(value: unknown, field: string): number {
	return typeof value === 'number' && Number.isFinite(value) ? value : reject(field)
}

function readLines(value: unknown, field: string): string[] {
	return Array.isArray(value) && value.every((line) => typeof line === 'string')
		? value
		: reject(field)
}

function readRecord(value: unknown, field: string): Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: reject(field)
}

function readViewport(value: unknown): EventViewport {
	const viewport = readRecord(value, 'viewport')

	const visual = readRecord(viewport.visual, 'viewport.visual')

	const safe = readRecord(viewport.safe, 'viewport.safe')

	return {
		visual: {
			height: readNumber(visual.height, 'viewport.visual.height'),
			offsetTop: readNumber(visual.offsetTop, 'viewport.visual.offsetTop'),
		},
		window: readNumber(viewport.window, 'viewport.window'),
		svh: readNumber(viewport.svh, 'viewport.svh'),
		dvh: readNumber(viewport.dvh, 'viewport.dvh'),
		lvh: readNumber(viewport.lvh, 'viewport.lvh'),
		safe: {
			top: readNumber(safe.top, 'viewport.safe.top'),
			bottom: readNumber(safe.bottom, 'viewport.safe.bottom'),
		},
		y: readNumber(viewport.y, 'viewport.y'),
	}
}

function readReport(value: unknown): EventReport {
	const report = readRecord(value, 'report')

	const origin = report.origin as EventReport['origin']

	if (!ORIGINS.has(origin)) reject('report.origin')

	const result: EventReport = {
		hash: readString(report.hash, 'report.hash'),
		origin,
		stack: readLines(report.stack, 'report.stack'),
		componentStack: readLines(report.componentStack, 'report.componentStack'),
		count: readNumber(report.count, 'report.count'),
		at: readString(report.at, 'report.at'),
		page: readString(report.page, 'report.page'),
		build: readString(report.build, 'report.build'),
		device: readString(report.device, 'report.device'),
		root: readString(report.root, 'report.root'),
		viewport: readViewport(report.viewport),
		trail: readLines(report.trail, 'report.trail'),
	}

	// An optional field that is absent stays absent, as in the report of the store.
	const route = readOptionalString(report.route, 'report.route')

	const started = readOptionalString(report.started, 'report.started')

	const pointer = readOptionalString(report.pointer, 'report.pointer')

	const focus = readOptionalString(report.focus, 'report.focus')

	if (route !== undefined) result.route = route

	if (started !== undefined) result.started = started

	if (pointer !== undefined) result.pointer = pointer

	if (focus !== undefined) result.focus = focus

	return result
}

/** The body of `request` as text. A body larger than `maxBytes` fails with 413 before the reader takes all of it. */
async function readBody(request: Request, maxBytes: number): Promise<string> {
	const tooLarge = () => new ReportExportError(`The report is larger than ${maxBytes} bytes`, 413)

	if (Number(request.headers.get('content-length')) > maxBytes) throw tooLarge()

	if (!request.body) return ''

	const reader = request.body.getReader()

	const chunks: Uint8Array[] = []

	let size = 0

	for (;;) {
		const { done, value } = await reader.read()

		if (done) break

		size += value.byteLength

		if (size > maxBytes) {
			await reader.cancel()

			throw tooLarge()
		}

		chunks.push(value)
	}

	const bytes = new Uint8Array(size)

	let offset = 0

	for (const chunk of chunks) {
		bytes.set(chunk, offset)

		offset += chunk.byteLength
	}

	return new TextDecoder().decode(bytes)
}

/**
 * Reads the report that `postReport` posts, in a route handler of the app.
 * The handler then files the title and the text in its tracker, with a token
 * that stays on the server. The result holds only the known fields of a
 * report, so the tracker gets no field that a client added.
 *
 * @throws {@link ReportExportError} for a body that is too large (413), or that is not a report (400).
 * @remarks Server only. The body comes from the browser, so the result is the
 * claim of a client. Put the route behind the auth or the rate limit of the
 * app, as for each other endpoint that writes data.
 * @example
 * ```ts
 * export async function POST(request: Request) {
 *   try {
 *     const { title, text } = await readReportExport(request)
 *
 *     await fileIssue(title, text)
 *
 *     return new Response(null, { status: 204 })
 *   } catch (error) {
 *     if (error instanceof ReportExportError) return new Response(error.message, { status: error.status })
 *
 *     throw error
 *   }
 * }
 * ```
 */
export async function readReportExport(
	request: Request,
	{ maxBytes = MAX_BYTES }: ReadReportOptions = {},
): Promise<EventReportExport> {
	const body = await readBody(request, maxBytes)

	let json: unknown

	try {
		json = JSON.parse(body)
	} catch {
		throw new ReportExportError('The report is not JSON', 400)
	}

	const record = readRecord(json, 'body')

	return {
		title: readString(record.title, 'title'),
		text: readString(record.text, 'text'),
		report: readReport(record.report),
	}
}
