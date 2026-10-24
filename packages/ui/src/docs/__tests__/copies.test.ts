// @vitest-environment node
import path from 'node:path'
import { parseAst } from 'vite'
import { describe, expect, it } from 'vitest'
import {
	appCatalog,
	copyChunks,
	localizeRoute,
	pointImports,
	readLangId,
} from '../plugin/copies.ts'
import { toDemoId } from '../plugin/demo-text.ts'

// The copy of a module of `pages/` in a language has each demo text in that
// language. Each page and each tab module shows the copy in the language of
// the reader.

const PAGES = path.resolve(import.meta.dirname, '..', 'pages')

const FILE = path.join(PAGES, 'components', 'button', 'demo.tsx')

const parse = (code: string) => parseAst(code, { lang: 'tsx' })

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

	it('gives the server build the chunks that each copy adds', () => {
		const code = 'export default function ButtonPage() {\n\treturn null\n}\n'

		const file = path.join(PAGES, 'components', 'button', 'index.tsx')

		const wrapped = localizeRoute(parse(code), code, file, ['es'], '/kit/localize.tsx', () => [
			'/assets/button-es.js',
		])

		expect(wrapped).toContain('{"es":["/assets/button-es.js"]})')
	})

	it('fails on a page whose default export is not a named function', () => {
		const code = 'export default () => null'

		expect(() => localizeRoute(parse(code), code, FILE, ['es'], '/kit/localize.tsx')).toThrow(
			/named function/,
		)
	})
})

describe('appCatalog', () => {
	it('drops the demo text from the catalog that the app imports', () => {
		const catalog = JSON.stringify({ 'docs.api.default': 'Default', [toDemoId('Save')]: 'Guardar' })

		expect(JSON.parse(appCatalog(catalog))).toEqual({ 'docs.api.default': 'Default' })
	})
})

describe('copyChunks', () => {
	it('gives the chunks that a copy loads and its module does not', () => {
		const manifest = {
			'index.tsx': {
				file: 'assets/index.js',
				imports: ['_kit.js'],
				dynamicImports: ['index.tsx?lang=es'],
			},
			'index.tsx?lang=es': {
				file: 'assets/index-es.js',
				imports: ['_kit.js', 'example.tsx?lang=es'],
			},
			'example.tsx?lang=es': { file: 'assets/example-es.js', imports: ['_kit.js'] },
			'_kit.js': { file: 'assets/kit.js' },
		}

		expect(copyChunks(manifest, 'index.tsx?lang=es')).toEqual([
			'assets/index-es.js',
			'assets/example-es.js',
		])

		expect(copyChunks(manifest, 'missing.tsx?lang=es')).toEqual([])
	})
})
