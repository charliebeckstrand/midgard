// @vitest-environment node
import path from 'node:path'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import { findDemoText, toDemoId, translateDemo } from '../plugin/demo-text.ts'

// The text of a demo is a literal of `pages/` that a reader sees. `pnpm intl`
// writes a catalog entry for each text, and the docs plugin builds the copy of
// each module in each language with the text of that language.

const PAGES = path.resolve(import.meta.dirname, '..', 'pages')

const FILE = path.join(PAGES, 'components', 'button', 'demo.tsx')

const parse = (code: string) => parseAst(code, { lang: 'tsx' })

/** The English message of each demo text of `code`, in source order. */
function texts(code: string): string[] {
	return findDemoText(parse(code), code, FILE).map(({ message }) => message)
}

describe('findDemoText', () => {
	it('finds JSX text, a string child, a text attribute, and a text property', () => {
		const code = `
			const options = [{ value: 'a', label: 'First option' }]
			export default () => (
				<Field label="Name" placeholder={'Your name'} className="w-full">
					Save
					{'the changes'}
					{ok ? 'Done' : 'Waiting'}
				</Field>
			)
		`

		expect(texts(code)).toEqual([
			'First option',
			'Name',
			'Your name',
			'Save',
			'the changes',
			'Done',
			'Waiting',
		])
	})

	it('reads JSX text as React renders it, and skips a literal with no letter', () => {
		const code = `export default () => (
			<p>
				For more information,
				see the guide.
				<b>42</b>
			</p>
		)`

		expect(texts(code)).toEqual(['For more information, see the guide.'])
	})

	it('leaves code as it is: a value, a class, and a template with a sum', () => {
		const code = `export default () => <Select value="draft" className="flex" aria-label={\`Row \${n + 1}\`} />`

		expect(texts(code)).toEqual([])
	})

	it('finds a template whose values are names and properties, as a message', () => {
		const code = `export default () => (
			<p aria-label={\`Edit \${row.name}, row \${index}\`}>{\`\${count} stops\`}{\`\${a}-\${b}\`}</p>
		)`

		expect(texts(code)).toEqual(['Edit {name}, row {index}', '{count} stops'])
	})

	it('finds a template with a call, and the text that an arrow function gives', () => {
		const code = `export default () => (
			<MapPoints detail={\`\${count} stops\`} clusterDetail={(count, span) => \`\${count} stops, \${miles(span)} across\`} />
		)`

		expect(texts(code)).toEqual(['{count} stops', '{count} stops, {miles} across'])
	})

	it('finds the text that a component gives, and leaves the text of another function', () => {
		const code = `function TriggerLabel() {
			const label = () => 'Code'

			return open ? 'Hide details' : 'Show details'
		}

		function describe() {
			return 'Code'
		}`

		expect(texts(code)).toEqual(['Hide details', 'Show details'])
	})

	it('finds each text of a list', () => {
		const code = `export default () => <Slider labels={['Minimum', 'Maximum']} />`

		expect(texts(code)).toEqual(['Minimum', 'Maximum'])
	})

	it('names the item of a list by the list', () => {
		const code = `export default () => <Rating getValueText={(value) => \`\${value} of 5, \${levels[value]}\`} />`

		expect(texts(code)).toEqual(['{value} of 5, {levels}'])
	})

	it('leaves a template whose values give one name twice', () => {
		const code = `export default () => <p title={\`\${a.name} and \${b.name}\`} />`

		expect(texts(code)).toEqual([])
	})

	it('finds each word of a call of words, with an id from its domain and its key', () => {
		const code = `
			import { words } from '../../../data/words.ts'
			export const statuses = words('order-status', { pending: 'Pending', label: 'Shipped' })
		`

		expect(findDemoText(parse(code), code, FILE).map(({ id, message }) => [id, message])).toEqual([
			['docs.data.order-status.pending', 'Pending'],
			['docs.data.order-status.label', 'Shipped'],
		])
	})

	it('fails on a word that is not a literal', () => {
		const code = `
			import { words } from '../../../data/words.ts'
			export const statuses = words('order-status', { pending: name })
		`

		expect(() => texts(code)).toThrow(/literal words/)
	})

	it('reads a call of another function named words as code', () => {
		const code = "const words = (a, b) => b; words('x', { pending: 'Pending' })"

		expect(texts(code)).toEqual([])
	})

	it('fails on a character reference in JSX text', () => {
		expect(() => texts('export default () => <p>Fish &amp; chips</p>')).toThrow(
			/character reference/,
		)
	})
})

describe('translateDemo', () => {
	it('writes each translation in the form of its place', () => {
		const code = `export default () => (
			<Field label="Name" placeholder={'Your name'}>
				Save
			</Field>
		)`

		const messages = {
			[toDemoId('Name')]: 'Nombre "completo"',
			[toDemoId('Your name')]: "Tu nombre's",
			[toDemoId('Save')]: "Guardar '{'",
		}

		const translated = translateDemo(parse(code), code, FILE, messages)

		expect(translated).toContain(`label={"Nombre \\"completo\\""}`)

		expect(translated).toContain(`placeholder={'Tu nombre\\'s'}`)

		// The message is ICU, so `'{'` is a quoted brace. JSX text cannot hold a brace.
		expect(translated).toContain('{"Guardar {"}')

		expect(() => parse(translated)).not.toThrow()
	})

	it('writes a template again from its translation, with the values of the source', () => {
		const code = `export default () => <p title={\`Edit \${row.name}, row \${index}\`} />`

		const messages = {
			[toDemoId('Edit {name}, row {index}')]: "Fila {index}: editar a {name} `'{'`",
		}

		const translated = translateDemo(parse(code), code, FILE, messages)

		expect(translated).toContain(`title={\`Fila \${index}: editar a \${row.name} \\\`{\\\`\`}`)

		expect(() => parse(translated)).not.toThrow()
	})

	it('writes each word of the demo data from the message of its id', () => {
		const code = `
			import { words } from '../../../data/words.ts'
			export const statuses = words('order-status', { pending: 'Pending' })
		`

		const translated = translateDemo(parse(code), code, FILE, {
			'docs.data.order-status.pending': 'Pendiente',
		})

		expect(translated).toContain("{ pending: 'Pendiente' }")
	})

	it('keeps a text with no translation in English', () => {
		const code = 'export default () => <p>Save</p>'

		expect(translateDemo(parse(code), code, FILE, {})).toBe(code)
	})
})
