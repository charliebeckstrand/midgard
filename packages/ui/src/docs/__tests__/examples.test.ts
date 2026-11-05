// @vitest-environment node
import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { parseAst } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { type Highlight, loadCodes } from '../plugin/examples.ts'

// "Show code" shows a playground with an attribute for each prop in the place
// of its `{...props}` spread. The code that only the spread uses goes with
// the spread, so the reader gets no unused parameter and no unused import.

const parse = (code: string) => parseAst(code, { lang: 'tsx' })

const highlight: Highlight = (code) => Promise.resolve({ html: code, bg: '', type: 'dark' })

let folder: string

beforeAll(async () => {
	folder = await mkdtemp(path.join(tmpdir(), 'docs-examples-'))
})

afterAll(() => rm(folder, { recursive: true }))

/** The code of a playground with `source`, and the code with `attributes` in the place of the spread. */
async function showCode(source: string, attributes = '') {
	const file = path.join(folder, 'playground.tsx')

	await writeFile(file, source)

	const { playground } = await loadCodes(parse, highlight, [file])

	if (!playground?.spread) throw new Error('the playground has no spread')

	const { code, spread } = playground

	return {
		code,
		printed: code.slice(0, spread.index) + attributes + code.slice(spread.index),
	}
}

describe('the code of a playground', () => {
	it('cuts the props parameter and its type import when the spread is the only use', async () => {
		const { code, printed } = await showCode(
			[
				"import { Button, type ButtonProps } from 'ui/button'",
				'',
				'export default function ButtonPlayground(props: ButtonProps) {',
				'\treturn <Button {...props}>Save</Button>',
				'}',
				'',
			].join('\n'),
			' color="red"',
		)

		expect(code).toBe(
			[
				"import { Button } from 'ui/button'",
				'',
				'export default function ButtonPlayground() {',
				'\treturn <Button>Save</Button>',
				'}',
				'',
			].join('\n'),
		)

		expect(printed).toContain('<Button color="red">Save</Button>')
	})

	it('cuts each type import of a multi-line import and of an intersection type', async () => {
		const { code } = await showCode(
			[
				'import {',
				'\ttype AccordionProps,',
				'\tAccordion,',
				'\tAccordionItem,',
				'\ttype AccordionTriggerProps,',
				"} from 'ui/accordion'",
				"import type { Extra } from './extra.ts'",
				'',
				"export default function AccordionPlayground(props: AccordionProps & Extra & { type?: 'single' }) {",
				'\treturn <Accordion {...props}><AccordionItem /></Accordion>',
				'}',
				'',
				'export type Trigger = AccordionTriggerProps',
				'',
			].join('\n'),
		)

		expect(code).toBe(
			[
				'import {',
				'\tAccordion,',
				'\tAccordionItem,',
				'\ttype AccordionTriggerProps,',
				"} from 'ui/accordion'",
				'',
				'export default function AccordionPlayground() {',
				'\treturn <Accordion><AccordionItem /></Accordion>',
				'}',
				'',
				'export type Trigger = AccordionTriggerProps',
				'',
			].join('\n'),
		)
	})

	it('cuts a type that only the parameter names, and keeps a type that other code names', async () => {
		const { code, printed } = await showCode(
			[
				"import { Kanban, type KanbanProps } from 'ui/kanban'",
				"import { type Column, type Load, loads } from './loads.ts'",
				'',
				'type Board = KanbanProps<Load, Column>',
				'',
				'export default function KanbanPlayground(props: Board) {',
				'\treturn <Kanban {...props} getKey={(load: Load) => load.id} data={loads} />',
				'}',
				'',
			].join('\n'),
			' dense',
		)

		expect(code).toBe(
			[
				"import { Kanban } from 'ui/kanban'",
				"import { type Load, loads } from './loads.ts'",
				'',
				'export default function KanbanPlayground() {',
				'\treturn <Kanban getKey={(load: Load) => load.id} data={loads} />',
				'}',
				'',
			].join('\n'),
		)

		expect(printed).toContain('<Kanban dense getKey=')
	})

	it('keeps the parameter and its type when other code reads the props', async () => {
		const source = [
			"import { AspectRatio, type AspectRatioProps } from 'ui/aspect-ratio'",
			'',
			'export default function AspectRatioPlayground(props: AspectRatioProps) {',
			"\treturn <AspectRatio {...props}>{props.ratio ?? '1/1'}</AspectRatio>",
			'}',
			'',
		].join('\n')

		const { code, printed } = await showCode(source, ' ratio="4/3"')

		expect(code).toBe(source.replace(' {...props}', ''))

		expect(printed).toContain('<AspectRatio ratio="4/3">')
	})
})
