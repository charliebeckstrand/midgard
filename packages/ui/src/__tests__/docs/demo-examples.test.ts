// @vitest-environment node
import { dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import type { ComponentApi } from '../../docs/engine/api-reference'
import { listBarrels } from '../../docs/engine/api-reference/engine/barrels'
import { apiRecord } from '../helpers/api-record'
import { redundantExamples } from '../helpers/demo-examples'
import { demoSourcesOf } from '../helpers/demo-sources'

// `<Axes>` generates the examples of each styling axis of a component. A
// hand-written `Example` must show something more: a prop that is not an
// axis, another component, or a flow with state. An example that repeats the
// axes or an earlier example fails here, and so does an example that calls
// itself `Default` on a page with a playground.

const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

const DEMOS = join(SRC, 'docs', 'demos')

describe('demo examples', () => {
	it('shows in each hand-written example something that the axes do not show', {
		timeout: 60_000,
	}, () => {
		const api = apiRecord()

		const redundant: string[] = []

		let pages = 0

		for (const { key, indexPath } of listBarrels(SRC)) {
			for (const { file, source } of demoSourcesOf(DEMOS, relative(SRC, dirname(indexPath)))) {
				pages++

				for (const example of redundantExamples(source, api[key] ?? []))
					redundant.push(
						`${relative(SRC, file)}:${example.line} "${example.title}": ${example.reason}`,
					)
			}
		}

		expect(pages, 'no demo pages found').toBeGreaterThan(0)

		expect(redundant, 'remove each example, or show in it something new').toEqual([])
	})
})

describe('redundantExamples', () => {
	const api: ComponentApi[] = [
		{
			name: 'Badge',
			props: [
				{ name: 'color', type: "'red' | 'blue'" },
				{ name: 'href', type: 'string' },
			],
		},
	]

	/** A demo page with one `<Axes>` of Badge, then `examples`. */
	const page = (examples: string, before = '') => `
		${before}
		export function Demo() {
			return (
				<>
					<Axes of="Badge" render={(props, label) => <Badge {...props}>{label}</Badge>} />
					${examples}
				</>
			)
		}
	`

	const titles = (source: string) => redundantExamples(source, api).map((example) => example.title)

	it('flags an example that sets only an axis', () => {
		expect(titles(page('<Example title="Red"><Badge color="red">New</Badge></Example>'))).toEqual([
			'Red',
		])
	})

	it('passes an example that sets a prop, a tag, or a nesting that the axes do not', () => {
		const source = page(`
			<Example title="Link"><Badge href="/new">New</Badge></Example>
			<Example title="In a button"><Button><Badge>New</Badge></Button></Example>
		`)

		expect(titles(source)).toEqual([])
	})

	it('flags an example that repeats an earlier example, and not one with another literal', () => {
		const source = page(`
			<Example title="Link"><Badge href="/a">A</Badge></Example>
			<Example title="Other link"><Badge href="/a">B</Badge></Example>
			<Example title="Third link"><Badge href="/c">C</Badge></Example>
		`)

		expect(titles(source)).toEqual(['Other link'])
	})

	it('follows a local component to what it renders', () => {
		const before = 'function Plain() { return <Badge>New</Badge> }'

		expect(titles(page('<Example title="Plain"><Plain /></Example>', before))).toEqual(['Plain'])
	})

	it('flags a generic title on an example of a component with a playground', () => {
		const source = page(`
			<Example title="Default"><Badge href="/new">New</Badge></Example>
			<Example title="Default"><Card /></Example>
		`)

		expect(redundantExamples(source, api).map((example) => example.reason)).toEqual([
			'the playground is the default; name what the example shows',
		])
	})
})
