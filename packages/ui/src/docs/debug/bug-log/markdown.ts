import type { Report } from './log.ts'

// The text of a report, in Markdown. View shows it, and Copy writes it.

/** A fenced block of lines, or nothing for no lines. */
function block(heading: string, lines: readonly string[]): string[] {
	return lines.length > 0 ? [`### ${heading}`, '', '```text', ...lines, '```', ''] : []
}

/** A table row. A pipe in the value would end the cell, so it goes out as `\|`. */
function row(name: string, value: string | undefined): string[] {
	return value ? [`| ${name} | ${value.replaceAll('|', '\\|')} |`] : []
}

/** One report in Markdown: a heading, a table of the page, then the stacks and the trail. */
export function markdownOf(report: Report): string {
	const { visual, window, svh, dvh, lvh, safe, y } = report.viewport

	return [
		`## ${report.title}${report.count > 1 ? ` ×${report.count}` : ''}`,
		'',
		'| Field | Value |',
		'|:---|:---|',
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
