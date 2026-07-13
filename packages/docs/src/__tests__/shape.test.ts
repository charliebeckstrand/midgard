import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript-6'
import type { TypeShape } from '../extractor'
import { classifyType } from '../extractor/shape'

const CASES_FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'shapes.ts')

// classifyType is a checker-level seam; a bare program over the standalone
// shapes fixture (no JSX, no DOM lib) keeps this suite fast.
let checker: ts.TypeChecker

let cases: ts.Type

beforeAll(() => {
	const program = ts.createProgram({
		rootNames: [CASES_FILE],
		options: {
			strict: true,
			target: ts.ScriptTarget.ES2022,
			moduleResolution: ts.ModuleResolutionKind.Bundler,
			types: [],
			skipLibCheck: true,
			noEmit: true,
		},
	})

	checker = program.getTypeChecker()

	const source = program.getSourceFile(CASES_FILE)

	const alias = source?.statements.find(
		(statement): statement is ts.TypeAliasDeclaration =>
			ts.isTypeAliasDeclaration(statement) && statement.name.text === 'Cases',
	)

	const symbol = alias && checker.getSymbolAtLocation(alias.name)

	if (!symbol) throw new Error('Cases alias missing from shapes fixture')

	cases = checker.getDeclaredTypeOfSymbol(symbol)
})

/** Classified shape of one `Cases` member. */
function shapeOf(name: string): TypeShape {
	const prop = cases.getProperty(name)

	if (!prop) throw new Error(`no case '${name}' on Cases`)

	return classifyType(checker.getTypeOfSymbol(prop), checker)
}

describe('type shapes', () => {
	it('classifies literal unions with their member values', () => {
		expect(shapeOf('steps')).toEqual({ k: 'literal-union', members: ['sm', 'md', 'lg'] })

		expect(shapeOf('mixed')).toEqual({ k: 'literal-union', members: ['a', 1] })
	})

	it('collapses the `true | false` pair to primitive boolean', () => {
		expect(shapeOf('flag')).toEqual({ k: 'primitive', name: 'boolean' })

		expect(shapeOf('on')).toEqual({ k: 'primitive', name: 'boolean' })
	})

	it('classifies primitives by name', () => {
		expect(shapeOf('text')).toEqual({ k: 'primitive', name: 'string' })

		expect(shapeOf('count')).toEqual({ k: 'primitive', name: 'number' })
	})

	it('classifies arrays by element shape', () => {
		expect(shapeOf('list')).toEqual({ k: 'array', element: { k: 'primitive', name: 'number' } })
	})

	it('classifies object fields recursively', () => {
		expect(shapeOf('layout')).toEqual({
			k: 'object',
			fields: {
				gap: { k: 'primitive', name: 'number' },
				wrap: { k: 'primitive', name: 'boolean' },
			},
		})
	})

	it('degrades fields past the depth budget to opaque', () => {
		expect(shapeOf('deep')).toEqual({
			k: 'object',
			fields: {
				a: {
					k: 'object',
					fields: {
						b: {
							k: 'object',
							fields: { c: { k: 'object', fields: { d: { k: 'opaque' } } } },
						},
					},
				},
			},
		})
	})

	it('records the minimum arity of function types', () => {
		expect(shapeOf('pick')).toEqual({ k: 'fn', arity: 1 })

		expect(shapeOf('pair')).toEqual({ k: 'fn', arity: 2 })
	})

	it('detects react-node by alias name alone', () => {
		expect(shapeOf('content')).toEqual({ k: 'react-node' })
	})

	it('falls back to opaque for unclassifiable types', () => {
		expect(shapeOf('handle')).toEqual({ k: 'opaque' })

		expect(shapeOf('loose')).toEqual({ k: 'opaque' })
	})

	it('guards self-referential types against cycles', () => {
		expect(shapeOf('tree')).toEqual({
			k: 'object',
			fields: { value: { k: 'primitive', name: 'string' }, next: { k: 'opaque' } },
		})
	})
})
