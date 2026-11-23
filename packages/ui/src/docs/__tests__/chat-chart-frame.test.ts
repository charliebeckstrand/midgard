// @vitest-environment node
import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// A chart keeps its aspect ratio, so it gets taller as it gets wider. In a chat
// demo that fills the column, the chart can be taller than the screen. Each
// chat demo with such a chart therefore has a `ratio` frame. The frame starts
// at half of the column, but not narrower than 32rem, and a drag on its end
// border sets the width up to the full column. A chart with
// `aspectRatio={false}` fills a box of a fixed height, so the rule does not
// apply to it.

const CHAT_PAGES = path.resolve(import.meta.dirname, '..', 'pages', 'modules', 'chat')

const read = (file: string) => readFileSync(path.join(CHAT_PAGES, file), 'utf8')

/** The path of each demo file under the chat pages, relative to them. */
function demoFiles(): string[] {
	return readdirSync(CHAT_PAGES, { recursive: true, encoding: 'utf8' })
		.filter((file) => file.endsWith('.tsx') && !file.endsWith('index.tsx'))
		.toSorted()
}

/** Whether `code` renders a chart that keeps its aspect ratio. */
const keepsRatio = (code: string) =>
	/from 'ui\/chart'/.test(code) && !/aspectRatio=\{false\}/.test(code)

/** The `<Example>` or `<Playground>` element that shows the demo in `file`. */
function findFrame(file: string): string | undefined {
	const index = read(path.join(path.dirname(file), 'index.tsx'))

	const name = index.match(
		new RegExp(`import (\\w+) from '\\./${path.basename(file).replace('.', '\\.')}'`),
	)?.[1]

	return name === undefined
		? undefined
		: index.match(new RegExp(`<\\w+ of=\\{${name}\\}[^>]*>`))?.[0]
}

describe('the chat demos with a chart that keeps its ratio', () => {
	const files = demoFiles().filter((file) => keepsRatio(read(file)))

	it('find demos to check', () => {
		expect(files.length).toBeGreaterThan(0)
	})

	it.each(files)('%s shows in a ratio frame', (file) => {
		expect(findFrame(file)).toMatch(/\bratio\b/)
	})
})
