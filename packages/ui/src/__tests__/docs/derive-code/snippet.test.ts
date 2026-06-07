import { describe, expect, it } from 'vitest'
import { collectSnippetImports, readSnippet, reindent } from '../../../docs/derive-code/snippet'
import type { ComponentInfo, Context } from '../../../docs/derive-code/types'

function contextWithRegistry(byName: Map<string, ComponentInfo>): Context {
	return {
		registry: { byType: { get: () => undefined }, byName },
		imports: new Map(),
	}
}

describe('readSnippet', () => {
	it('returns the `__code` string attached to a function', () => {
		const Demo = Object.assign(
			function Demo() {
				return null
			},
			{ __code: 'function Demo() { return null }' },
		)

		expect(readSnippet(Demo)).toBe('function Demo() { return null }')
	})

	it('returns null for a function with no `__code` decoration', () => {
		function Plain() {
			return null
		}

		expect(readSnippet(Plain)).toBeNull()
	})

	it('returns null for non-function inputs', () => {
		expect(readSnippet(null)).toBeNull()

		expect(readSnippet(undefined)).toBeNull()

		expect(readSnippet('text')).toBeNull()

		expect(readSnippet({ __code: 'never read' })).toBeNull()
	})

	it('returns null when `__code` is present but not a string', () => {
		const Demo = Object.assign(
			function Demo() {
				return null
			},
			{ __code: 42 },
		)

		expect(readSnippet(Demo)).toBeNull()
	})
})

describe('reindent', () => {
	it('passes single-line snippets through verbatim', () => {
		expect(reindent('return null', '\t\t')).toBe('return null')
	})

	it('keeps line 1 as authored and prefixes targetIndent onto subsequent lines (no dedent path)', () => {
		// Closing `}` at col 0 — typical function source. minIndent = 0,
		// so subsequent lines get targetIndent prefixed onto their original
		// whitespace.
		const source = ['function Demo() {', '\treturn null', '}'].join('\n')

		const lines = reindent(source, '\t').split('\n')

		expect(lines[0]).toBe('function Demo() {')

		expect(lines[1]).toBe('\t\treturn null')

		expect(lines[2]).toBe('\t}')
	})

	it('dedents subsequent lines by the shared minimum indent before applying targetIndent', () => {
		// All non-line-0 lines start with at least one tab — minIndent = 1,
		// so the leading tab is stripped before targetIndent is applied.
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

		// minIndent computed only from the non-empty subsequent lines (both
		// leading=1) → 1. The empty line is preserved as ''.
		expect(lines[2]).toBe('return null')

		expect(lines[3]).toBe('}')
	})
})

describe('collectSnippetImports', () => {
	it('collects UI component imports from JSX opening tags via the registry', () => {
		const context = contextWithRegistry(
			new Map([
				['Stack', { name: 'Stack', module: 'stack' }],
				['FileUpload', { name: 'FileUpload', module: 'file-upload' }],
			]),
		)

		collectSnippetImports('<Stack><FileUpload /></Stack>', context)

		expect(context.imports.get('stack')).toEqual(new Set(['Stack']))

		expect(context.imports.get('file-upload')).toEqual(new Set(['FileUpload']))
	})

	it('ignores PascalCase tags that the registry does not recognize', () => {
		const context = contextWithRegistry(new Map())

		collectSnippetImports('<UnknownThing />', context)

		expect(context.imports.size).toBe(0)
	})

	it('collects React hooks via bare identifier use', () => {
		const context = contextWithRegistry(new Map())

		collectSnippetImports('const [v, setV] = useState(0)', context)

		expect(context.imports.get('react')).toEqual(new Set(['useState']))
	})

	it('collects React 19 hooks (use, useActionState, useOptimistic, useFormStatus)', () => {
		const context = contextWithRegistry(new Map())

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

		expect(reactImports).toContain('useFormStatus')
	})

	it('does not mistake method calls for React hooks (lookbehind on `.`)', () => {
		const context = contextWithRegistry(new Map())

		collectSnippetImports('router.use(plugin)', context)

		expect(context.imports.get('react')).toBeUndefined()
	})

	it('does not import non-React hook-shaped identifiers (e.g. useFoo)', () => {
		const context = contextWithRegistry(new Map())

		collectSnippetImports('const v = useFoo()', context)

		expect(context.imports.get('react')).toBeUndefined()
	})

	it('dedupes repeated matches into a single import entry', () => {
		const context = contextWithRegistry(new Map([['Stack', { name: 'Stack', module: 'stack' }]]))

		collectSnippetImports('<Stack><Stack /></Stack>', context)

		expect(context.imports.get('stack')?.size).toBe(1)
	})
})
