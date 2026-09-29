// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { reindent } from '../../derive-code/indent'
import { collectSnippetImports, readSnippet, snippetCode } from '../../derive-code/internals'
import { makeContext } from './helpers'

describe('readSnippet', () => {
	const attached = {
		name: 'Demo',
		declarations: ['const size = 2', 'function Demo() { return null }'],
		blocks: [0, 1],
		imports: { cn: { module: 'core' } },
	}

	it('returns the `__snippet` attached to a function', () => {
		const Demo = Object.assign(
			function Demo() {
				return null
			},
			{ __snippet: attached },
		)

		expect(readSnippet(Demo)).toBe(attached)
	})

	it('returns null for a function with no `__snippet` decoration', () => {
		function Plain() {
			return null
		}

		expect(readSnippet(Plain)).toBeNull()
	})

	it('returns null for non-function inputs', () => {
		expect(readSnippet(null)).toBeNull()

		expect(readSnippet(undefined)).toBeNull()

		expect(readSnippet('text')).toBeNull()

		expect(readSnippet({ __snippet: attached })).toBeNull()
	})

	it('returns null when `__snippet` has another shape', () => {
		for (const shape of [42, 'code', { ...attached, name: 1 }, { ...attached, blocks: 0 }]) {
			const Demo = Object.assign(
				function Demo() {
					return null
				},
				{ __snippet: shape },
			)

			expect(readSnippet(Demo)).toBeNull()
		}
	})
})

describe('snippetCode', () => {
	it('joins the blocks of the snippet from its table, and leaves the rest', () => {
		const code = snippetCode({
			name: 'B',
			declarations: ['const a = 1', 'const b = 2', 'function B() { return b }'],
			blocks: [1, 2],
			imports: {},
		})

		expect(code).toBe('const b = 2\n\nfunction B() { return b }')
	})
})

describe('reindent', () => {
	it('passes single-line snippets through verbatim', () => {
		expect(reindent('return null', '\t\t')).toBe('return null')
	})

	it('keeps line 1 as authored and prefixes targetIndent onto subsequent lines (no dedent path)', () => {
		// Closing `}` at col 0 makes minIndent 0; targetIndent is prefixed onto
		// each subsequent line's original whitespace.
		const source = ['function Demo() {', '\treturn null', '}'].join('\n')

		const lines = reindent(source, '\t').split('\n')

		expect(lines[0]).toBe('function Demo() {')

		expect(lines[1]).toBe('\t\treturn null')

		expect(lines[2]).toBe('\t}')
	})

	it('dedents subsequent lines by the shared minimum indent before applying targetIndent', () => {
		// All non-line-0 lines start with at least one tab, so minIndent = 1;
		// the leading tab is stripped before targetIndent is applied.
		const source = ['{', '\tif (x) {', '\t\treturn 1', '\t}'].join('\n')

		const lines = reindent(source, '').split('\n')

		expect(lines[0]).toBe('{')

		expect(lines[1]).toBe('if (x) {')

		expect(lines[2]).toBe('\treturn 1')

		expect(lines[3]).toBe('}')
	})

	it('emits whitespace-only lines as truly empty', () => {
		const source = ['function Demo() {', '   ', '\treturn null', '}'].join('\n')

		const lines = reindent(source, '').split('\n')

		expect(lines[1]).toBe('')
	})

	it('skips empty lines when computing minIndent so they do not crash on Math.min', () => {
		const source = ['{', '', '\treturn null', '\t}'].join('\n')

		const lines = reindent(source, '').split('\n')

		expect(lines[0]).toBe('{')

		expect(lines[1]).toBe('')

		// minIndent is computed from non-empty subsequent lines only (both
		// leading=1) → 1. The empty line is preserved as ''.
		expect(lines[2]).toBe('return null')

		expect(lines[3]).toBe('}')
	})
})

describe('collectSnippetImports', () => {
	it('collects UI component imports from JSX opening tags via the registry', () => {
		const context = makeContext({
			byName: new Map([
				['Stack', { name: 'Stack', module: 'stack' }],
				['FileUpload', { name: 'FileUpload', module: 'file-upload' }],
			]),
		})

		collectSnippetImports('<Stack><FileUpload /></Stack>', context)

		expect(context.imports.get('stack')).toEqual(new Set(['Stack']))

		expect(context.imports.get('file-upload')).toEqual(new Set(['FileUpload']))
	})

	it('registers each entry of the attached import table', () => {
		const context = makeContext()

		collectSnippetImports('const rules = defaultPasswordRules', context, {
			defaultPasswordRules: { module: 'password-strength' },
			PasswordRule: { module: 'password-strength', type: true },
		})

		expect(context.imports.get('password-strength')).toEqual(
			new Set(['defaultPasswordRules', 'type PasswordRule']),
		)
	})

	it('ignores PascalCase tags that the registry does not recognize', () => {
		const context = makeContext({ byName: new Map() })

		collectSnippetImports('<UnknownThing />', context)

		expect(context.imports.size).toBe(0)
	})

	it('collects React hooks via bare identifier use', () => {
		const context = makeContext({ byName: new Map() })

		collectSnippetImports('const [v, setV] = useState(0)', context)

		expect(context.imports.get('react')).toEqual(new Set(['useState']))
	})

	it('collects React 19 hooks, attributing react-dom hooks to react-dom', () => {
		const context = makeContext({ byName: new Map() })

		const body = [
			'const data = use(promise)',
			'const [state, action] = useActionState(submit, null)',
			'const [optimistic, addOptimistic] = useOptimistic(items)',
			'const status = useFormStatus()',
		].join('\n')

		collectSnippetImports(body, context)

		const reactImports = context.imports.get('react')

		expect(reactImports).toContain('use')

		expect(reactImports).toContain('useActionState')

		expect(reactImports).toContain('useOptimistic')

		// `useFormStatus` is a react-dom export, not react.
		expect(context.imports.get('react-dom')).toContain('useFormStatus')

		expect(reactImports).not.toContain('useFormStatus')
	})

	it('does not mistake method calls for React hooks (lookbehind on `.`)', () => {
		const context = makeContext({ byName: new Map() })

		collectSnippetImports('router.use(plugin)', context)

		expect(context.imports.get('react')).toBeUndefined()
	})

	it('does not import non-React hook-shaped identifiers (e.g. useFoo)', () => {
		const context = makeContext({ byName: new Map() })

		collectSnippetImports('const v = useFoo()', context)

		expect(context.imports.get('react')).toBeUndefined()
	})

	it('does not import `use` from a bare word in prose or a comment', () => {
		const context = makeContext({ byName: new Map() })

		collectSnippetImports('// use the shared ref here\nconst label = "easy to use"', context)

		expect(context.imports.get('react')).toBeUndefined()
	})

	it('imports a hook called with an explicit generic argument (`useState<T>()`)', () => {
		const context = makeContext({ byName: new Map() })

		collectSnippetImports('const [v, setV] = useState<number>(0)', context)

		expect(context.imports.get('react')).toEqual(new Set(['useState']))
	})

	it('dedupes repeated matches into a single import entry', () => {
		const context = makeContext({
			byName: new Map([['Stack', { name: 'Stack', module: 'stack' }]]),
		})

		collectSnippetImports('<Stack><Stack /></Stack>', context)

		expect(context.imports.get('stack')?.size).toBe(1)
	})
})
