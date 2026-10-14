import { viewport } from './events-probes'
import { placeOf } from './events-target'
import type { EventEntry, EventReport } from './types'

// The report of a bug or of a capture: the snapshot of the page, and its text
// in Markdown, which the report view shows and Copy writes.

/** The file of this module, whose hash names the build. */
const BUILD = new URL(import.meta.url).pathname.split('/').at(-1) ?? ''

/** What the store knows about a report before the snapshot. */
export type ReportInput = Pick<
	EventReport,
	'origin' | 'stack' | 'componentStack' | 'route' | 'trail' | 'started'
> & {
	/** The text of the event, which names the report. */
	title: string
	/** The element of the last `pointerdown` outside the tools. */
	pointer?: Element
	/** The element of the last `focusin` outside the tools. */
	focus?: Element
}

/** A 7-digit hex hash of a text (32-bit FNV-1a). */
export function hashOf(text: string): string {
	let hash = 0x811c9dc5

	for (let index = 0; index < text.length; index++)
		hash = Math.imul(hash ^ text.charCodeAt(index), 0x01000193)

	return (hash >>> 0).toString(16).padStart(8, '0').slice(0, 7)
}

/** The report of the page now. */
export function createReport({ title, pointer, focus, ...input }: ReportInput): EventReport {
	const pointerKind = matchMedia('(pointer: coarse)').matches ? 'coarse' : 'fine'

	const offline = navigator.onLine ? '' : ', offline'

	const report: EventReport = {
		...input,
		hash: hashOf(`${title} ${location.href} ${performance.timeOrigin + performance.now()}`),
		count: 1,
		at: new Date().toISOString(),
		page: location.pathname + location.search + location.hash,
		build: BUILD,
		device: `${navigator.userAgent}, dpr ${devicePixelRatio}, ${pointerKind} pointer${offline}`,
		root: Array.from(document.documentElement.attributes, ({ name, value }) =>
			value ? `${name}="${value}"` : name,
		).join(' '),
		viewport: { ...viewport(), y: Math.round(scrollY) },
	}

	if (pointer?.isConnected) report.pointer = placeOf(pointer)

	if (focus?.isConnected) report.focus = placeOf(focus)

	return report
}

/** A fenced block of lines, or nothing for no lines. */
function block(heading: string, lines: readonly string[]): string[] {
	return lines.length > 0 ? [`### ${heading}`, '', '```text', ...lines, '```', ''] : []
}

/** A table row. A pipe in the value would end the cell, so it goes out as `\|`. */
function row(name: string, value: string | undefined): string[] {
	return value ? [`| ${name} | ${value.replaceAll('|', '\\|')} |`] : []
}

/** The title of a report: the text of its event, with the count of a bug that occurs more than one time. */
export function titleOf({ text, report }: EventEntry): string {
	return report && report.count > 1 ? `${text} ×${report.count}` : text
}

/** The report of an event in Markdown: a heading, a table of the page, then the stacks and the trail. */
export function markdownOf(entry: EventEntry & { report: EventReport }): string {
	const { report } = entry

	const { visual, window, svh, dvh, lvh, safe, y } = report.viewport

	return [
		`## ${titleOf(entry)}`,
		'',
		'| Field | Value |',
		'|:---|:---|',
		...row('Id', `\`${report.hash}\``),
		...row('Origin', report.origin),
		...row('Route', report.route && `\`${report.route}\``),
		...row('Started', report.started),
		...row('At', report.at),
		...row('Page', `\`${report.page}\``),
		...row('Build', `\`${report.build}\``),
		...row('Device', report.device),
		...row('Root', `\`<html ${report.root}>\``),
		...row(
			'Viewport',
			`visual ${visual.height}@${visual.offsetTop}, window ${window}, svh ${svh}, dvh ${dvh}, lvh ${lvh}, safe ${safe.top}/${safe.bottom}, y ${y}`,
		),
		...row('Pointer', report.pointer),
		...row('Focus', report.focus),
		'',
		...block('Stack', report.stack),
		...block('Component stack', report.componentStack),
		...block('Trail', report.trail),
	]
		.join('\n')
		.trimEnd()
}
