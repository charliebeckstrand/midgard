// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { reindent } from '../../derive-code/indent'
import { readSnippet, registerUses } from '../../derive-code/internals'
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

describe('registerUses', () => {
	it('imports a component of the registry by its name', () => {
		const context = makeContext({
			byName: new Map([
				['Stack', { name: 'Stack', module: 'stack' }],
				['FileUpload', { name: 'FileUpload', module: 'file-upload' }],
			]),
		})

		registerUses(['Stack', 'FileUpload'], context)

		expect(context.imports.get('stack')).toEqual(new Set(['Stack']))

		expect(context.imports.get('file-upload')).toEqual(new Set(['FileUpload']))
	})

	it('imports a name as the import table of the facts says, before the registry', () => {
		const context = makeContext({
			byName: new Map([['PasswordRule', { name: 'PasswordRule', module: 'other' }]]),
		})

		context.facts = {
			elements: [],
			bindings: {},
			declarations: [],
			imports: {
				defaultPasswordRules: { module: 'password-strength' },
				PasswordRule: { module: 'password-strength', type: true },
			},
			uses: {},
		}

		registerUses(['defaultPasswordRules', 'PasswordRule'], context)

		expect(context.imports.get('password-strength')).toEqual(
			new Set(['defaultPasswordRules', 'type PasswordRule']),
		)

		expect(context.imports.has('other')).toBe(false)
	})

	it('imports React hooks, and react-dom hooks from react-dom', () => {
		const context = makeContext({ byName: new Map() })

		registerUses(['use', 'useActionState', 'useOptimistic', 'useFormStatus'], context)

		expect(context.imports.get('react')).toEqual(
			new Set(['use', 'useActionState', 'useOptimistic']),
		)

		expect(context.imports.get('react-dom')).toEqual(new Set(['useFormStatus']))
	})

	it('imports nothing for a name that is neither a component nor a hook', () => {
		const context = makeContext({ byName: new Map() })

		registerUses(['UnknownThing', 'useFoo', 'value', 'Math'], context)

		expect(context.imports.size).toBe(0)
	})

	it('dedupes a repeated name into a single import entry', () => {
		const context = makeContext({
			byName: new Map([['Stack', { name: 'Stack', module: 'stack' }]]),
		})

		registerUses(['Stack', 'Stack'], context)

		expect(context.imports.get('stack')?.size).toBe(1)
	})
})
