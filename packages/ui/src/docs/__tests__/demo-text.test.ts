// @vitest-environment node
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import es from '../lang/es.json' with { type: 'json' }
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

	it('takes a code as the key of a word', () => {
		const code = `
			import { words } from '../../../data/words.ts'
			export const states = words('us-state', { '37': 'North Carolina' })
		`

		expect(findDemoText(parse(code), code, FILE).map(({ id }) => id)).toEqual([
			'docs.data.us-state.37',
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

	it('finds the message of a check, of a refused cell, and of a summary', () => {
		const code = `
			const refusal = { columnId: 'name', error: name === '' ? 'Enter a name.' : 'Enter a different name.' }
			const result = { fieldErrors: { username: 'This one is taken.' } }
			export default () => (
				<Form
					validate={{ email: (value) => (value.includes('@') ? undefined : 'Enter a valid email.') }}
					summarize={(selected) => \`\${selected.length} reviewers\`}
				/>
			)
		`

		expect(texts(code)).toEqual([
			'Enter a name.',
			'Enter a different name.',
			'This one is taken.',
			'Enter a valid email.',
			'{length} reviewers',
		])
	})

	it('finds each string that a check with a block body returns or pushes, and no other', () => {
		const code = `export default () => (
			<Form
				validate={{
					password: (value) => {
						const issues = []

						if (value === 'admin') issues.push('Use another password.')

						const hint = () => 'Not a message'

						return issues.length > 0 ? issues : 'Fine'
					},
				}}
			/>
		)`

		expect(texts(code)).toEqual(['Use another password.', 'Fine'])
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

describe('the demos', () => {
	/** The English message of each demo text of the module at `file` under `pages/`. */
	function demoTexts(file: string): string[] {
		const code = readFileSync(path.join(PAGES, file), 'utf8')

		return findDemoText(parse(code), code, path.join(PAGES, file)).map(({ message }) => message)
	}

	// The page smoke test cannot see a text that shows only after an open, a
	// submit, a blur, or a refusal, so each such text needs an entry here.
	it.each([
		['components/command-palette/commands.tsx', 'Files'],
		['components/command-palette/virtualized.tsx', 'Command {id}'],
		['components/dialog/long-content.tsx', 'Your account'],
		['components/drawer/fit-content.tsx', 'How do I change my password?'],
		['components/file-upload/rejected-files.tsx', 'Select one image.'],
		['components/combobox/custom-summary.tsx', '{length} reviewers'],
		['modules/grid/virtualization/server-infinite-scroll.tsx', 'No more results'],
		['modules/grid/editing/async-commit.tsx', 'Enter a different name.'],
		['modules/grid/editing/new-row.tsx', 'Enter a name.'],
		['primitives/skeleton/skeleton-variants.tsx', 'Chart (pie)'],
		['modules/form/server-errors.tsx', 'Enter a different username. This one is taken.'],
		['modules/form/success-and-failure.tsx', 'The server is busy. Try again in a minute.'],
		['modules/form/validation.tsx', 'Add a number.'],
		['components/calendar/range.tsx', 'to'],
	])('gives an entry for the text of %s', (file, message) => {
		expect(demoTexts(file)).toContain(message)
	})

	it('keeps the key of a command in the Spanish copy', () => {
		const file = path.join(PAGES, 'components', 'command-palette', 'commands.tsx')

		const code = readFileSync(file, 'utf8')

		expect(translateDemo(parse(code), code, file, es)).toContain(
			"{ id: 'delete', label: 'Eliminar'",
		)
	})
})
