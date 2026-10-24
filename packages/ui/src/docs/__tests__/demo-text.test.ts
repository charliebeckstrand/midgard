// @vitest-environment node
import path from 'node:path'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import {
	findDemoText,
	localizeRoute,
	pointImports,
	readLangId,
	toDemoId,
	translateDemo,
} from '../plugin/demo-text.ts'

// The text of a demo is a literal of `pages/` that a reader sees. `pnpm intl`
// writes a catalog entry for each text, and the docs plugin builds the copy of
// each module in each language with the text of that language.

const PAGES = path.resolve(import.meta.dirname, '..', 'pages')

const FILE = path.join(PAGES, 'components', 'button', 'demo.tsx')

const parse = (code: string) => parseAst(code, { lang: 'tsx' })

/** The English text of each demo text of `code`, in source order. */
function texts(code: string): string[] {
	return findDemoText(parse(code), code, FILE).map(({ text }) => text)
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

	it('leaves code as it is: a value, a class, a key, and a template with a value', () => {
		const code = `export default () => <Select value="draft" className="flex" aria-label={\`Row \${n}\`} />`

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

	it('keeps a text with no translation in English', () => {
		const code = 'export default () => <p>Save</p>'

		expect(translateDemo(parse(code), code, FILE, {})).toBe(code)
	})
})

describe('the copy of a module in a language', () => {
	it('reads the file and the language of a module id', () => {
		expect(readLangId(`${FILE}?lang=es`)).toEqual({ file: FILE, language: 'es' })

		expect(readLangId(FILE)).toEqual({ file: FILE })
	})

	it('points each import of a module of pages at its copy', () => {
		const code = [
			"import Example from './example.tsx'",
			"import { rows } from '../table/data.ts'",
			"import { Button } from 'ui/button'",
			"import { Playground } from '../../../kit/index.ts'",
		].join('\n')

		const pointed = pointImports(parse(code), code, FILE, PAGES, 'es')

		expect(pointed).toContain(`from "./example.tsx?lang=es"`)

		expect(pointed).toContain(`from "../table/data.ts?lang=es"`)

		expect(pointed).toContain(`from 'ui/button'`)

		expect(pointed).toContain(`from '../../../kit/index.ts'`)
	})

	it('wraps the default export of a page with the loader of each copy', () => {
		const code = 'export default function ButtonPage() {\n\treturn null\n}\n'

		const file = path.join(PAGES, 'components', 'button', 'index.tsx')

		const wrapped = localizeRoute(parse(code), code, file, ['es'], '/kit/localize.tsx')

		expect(wrapped).toContain('function ButtonPage()')

		expect(wrapped).toContain(
			'export default __localize(ButtonPage, { es: () => import("./index.tsx?lang=es") })',
		)

		expect(() => parse(wrapped)).not.toThrow()
	})

	it('fails on a page whose default export is not a named function', () => {
		const code = 'export default () => null'

		expect(() => localizeRoute(parse(code), code, FILE, ['es'], '/kit/localize.tsx')).toThrow(
			/named function/,
		)
	})
})
