// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// A chart keeps its aspect ratio, so it gets taller as it gets wider. In a chat
// demo that fills the column, the chart can be taller than the screen. Each
// such chart in a chat demo therefore sits in a `ResizablePanel`. The panel
// starts at a part of the column, and the handle at its end edge sets the
// width up to the full column. The frame of the example stays full width. A
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

/** Whether the code before an element leaves a `ResizablePanel` open around it. */
const inPanel = (before: string) =>
	before.lastIndexOf('<ResizablePanel') > before.lastIndexOf('</ResizablePanel>')

describe('the chat demos with a chart that keeps its ratio', () => {
	const files = demoFiles().filter((file) => findRatioCharts(read(file)).length > 0)

	it('find demos to check', () => {
		expect(files.length).toBeGreaterThan(0)
	})

	it.each(files)('%s puts each such chart in a resizable panel', (file) => {
		for (const { before } of findRatioCharts(read(file))) expect(inPanel(before)).toBe(true)
	})
})
