// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// A chart keeps its aspect ratio, so it gets taller as it gets wider. In a chat
// demo that fills the column, the chart can be taller than the screen. Each
// such chart in a chat demo therefore sits in a `ResizablePanel`. The panel
// starts at half of the column and can go down to 30%. The handle at its end
// edge sets the width up to the full column. The frame of the example stays full width. A
// chart with `aspectRatio={false}` fills a box of a fixed height, so the rule
// does not apply to it.

const CHAT_PAGES = path.resolve(import.meta.dirname, '..', 'pages', 'modules', 'chat')

const read = (file: string) => readFileSync(path.join(CHAT_PAGES, file), 'utf8')

/** The path of each demo file under the chat pages, relative to them. */
function demoFiles(): string[] {
	return readdirSync(CHAT_PAGES, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.tsx') && !file.endsWith('index.tsx'))
		.toSorted()
}

/**
 * Each chart element in `code` that keeps its aspect ratio, such as
 * `<BarChart … />`, with the code before it. The test reads each chart element,
 * because an `aspectRatio` of another element, such as a map, does not apply
 * to the chart.
 */
function findRatioCharts(code: string): { chart: string; before: string }[] {
	if (!/from 'ui\/chart'/.test(code)) return []

	return Array.from(code.matchAll(/<(\w*Chart)\b[\s\S]*?(?:\/>|<\/\1>)/g), (match) => ({
		chart: match[0],
		before: code.slice(0, match.index),
	})).filter(({ chart }) => !/aspectRatio=\{false\}/.test(chart))
}

/**
 * The opening tag of the `ResizablePanel` that the code before an element
 * leaves open around it, or `null` when no panel is open there.
 */
function openPanel(before: string): string | null {
	const start = before.lastIndexOf('<ResizablePanel')

	if (start === -1 || start < before.lastIndexOf('</ResizablePanel>')) return null

	return before.slice(start, before.indexOf('>', start) + 1)
}

/**
 * The code before each place where the demo draws a chart. A chart in a
 * `const`, such as `const chart = (<Pane>…</Pane>)`, draws where the demo
 * writes `{chart}`, so each such use is a place. Otherwise the chart draws
 * where it is written.
 */
function drawSites(code: string, before: string): string[] {
	const holder = Array.from(before.matchAll(/\n\tconst (\w+) = \(\n/g)).at(-1)

	// The chart is in the `const` only when the `const` has not closed before it.
	if (holder === undefined || before.includes('\n\t)\n', holder.index)) return [before]

	const use = `{${holder[1]}}`

	const sites: string[] = []

	for (let at = code.indexOf(use); at !== -1; at = code.indexOf(use, at + 1)) {
		sites.push(code.slice(0, at))
	}

	return sites
}

describe('the chat demos with a chart that keeps its ratio', () => {
	const files = demoFiles().filter((file) => findRatioCharts(read(file)).length > 0)

	it('find demos to check', () => {
		expect(files.length).toBeGreaterThan(0)
	})

	it.each(files)('%s puts each such chart in a resizable panel at half the column', (file) => {
		const code = read(file)

		for (const { before } of findRatioCharts(code)) {
			// A demo can stack its panes at phone width, so one place in a panel is enough.
			const panels = drawSites(code, before)
				.map(openPanel)
				.filter((panel) => panel !== null)

			expect(panels).not.toEqual([])

			for (const panel of panels) {
				expect(panel).toContain('defaultSize={50}')

				expect(panel).toContain('minSize={30}')
			}
		}
	})
})
