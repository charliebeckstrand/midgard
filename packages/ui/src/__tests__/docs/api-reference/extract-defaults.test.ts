import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractDefaults } from '../../../docs/api-reference/engine/extract-defaults'

function fromFunction(text: string): ts.SignatureDeclaration {
	const sf = ts.createSourceFile(
		'virtual.tsx',
		text,
		ts.ScriptTarget.Latest,
		true,
		ts.ScriptKind.TSX,
	)

	// Scan rather than assume statement 0, so a preceding `const` (the source of a
	// resolved default) can sit beside the function the way real components do.
	for (const stmt of sf.statements) {
		if (ts.isFunctionDeclaration(stmt)) return stmt

		if (ts.isVariableStatement(stmt)) {
			const init = stmt.declarationList.declarations[0]?.initializer

			if (!init) continue

			try {
				return findFirstFunctionLike(init)
			} catch {
				/* not function-like; keep scanning */
			}
		}
	}

	throw new Error('no function-like statement parsed from source')
}

function findFirstFunctionLike(node: ts.Node): ts.SignatureDeclaration {
	if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node)) {
		return node
	}

	if (ts.isCallExpression(node)) {
		for (const arg of node.arguments) {
			try {
				return findFirstFunctionLike(arg)
			} catch {
				/* try next */
			}
		}
	}

	throw new Error('no function-like node found')
}

describe('extractDefaults — inline destructured defaults', () => {
	it('extracts a single string default from destructured parameters', () => {
		const fn = fromFunction(`function Foo({ size = 'md' }) { return null }`)

		expect(extractDefaults(fn).get('size')).toBe(`'md'`)
	})

	it('extracts multiple defaults in declaration order', () => {
		const fn = fromFunction(
			`function Foo({ size = 'md', color = 'zinc', disabled = false }) { return null }`,
		)

		expect([...extractDefaults(fn).entries()]).toEqual([
			['size', `'md'`],
			['color', `'zinc'`],
			['disabled', `false`],
		])
	})

	it('preserves the source text of complex default expressions verbatim', () => {
		const fn = fromFunction(`function Foo({ items = [1, 2, 3] }) { return null }`)

		expect(extractDefaults(fn).get('items')).toBe('[1, 2, 3]')
	})

	it('skips parameters that have no default initializer', () => {
		const fn = fromFunction(`function Foo({ size = 'md', label, color = 'zinc' }) { return null }`)

		const defaults = extractDefaults(fn)

		expect(defaults.has('size')).toBe(true)
		expect(defaults.has('color')).toBe(true)
		expect(defaults.has('label')).toBe(false)
	})

	it('returns an empty map when the first parameter is not a destructure', () => {
		const fn = fromFunction(`function Foo(props) { return null }`)

		expect(extractDefaults(fn).size).toBe(0)
	})

	it('returns an empty map when the function has no parameters', () => {
		const fn = fromFunction(`function Foo() { return null }`)

		expect(extractDefaults(fn).size).toBe(0)
	})

	it('handles arrow function initializers', () => {
		const fn = fromFunction(`const Foo = ({ size = 'md' }) => null`)

		expect(extractDefaults(fn).get('size')).toBe(`'md'`)
	})

	it('unwraps a forwardRef wrapper and reads its inner destructured defaults', () => {
		const fn = fromFunction(`const Foo = forwardRef(({ size = 'md' }, ref) => null)`)

		expect(extractDefaults(fn).get('size')).toBe(`'md'`)
	})
})

describe('extractDefaults — identifier defaults resolved to same-file const literals', () => {
	it('resolves an identifier default to its same-file const string literal', () => {
		const fn = fromFunction(
			`const DEFAULT_TRIGGER_SHORTCUT = '$mod+KeyK'\n` +
				`function Foo({ triggerShortcut = DEFAULT_TRIGGER_SHORTCUT }) { return null }`,
		)

		expect(extractDefaults(fn).get('triggerShortcut')).toBe(`'$mod+KeyK'`)
	})

	it('resolves identifiers that name array and numeric const literals', () => {
		const fn = fromFunction(
			`const ZOOM = [0.5, 1, 2]\nconst DELAY = 200\n` +
				`function Foo({ zoom = ZOOM, delay = DELAY }) { return null }`,
		)

		const defaults = extractDefaults(fn)

		expect(defaults.get('zoom')).toBe('[0.5, 1, 2]')
		expect(defaults.get('delay')).toBe('200')
	})

	it('unwraps `as const` when resolving a const literal', () => {
		const fn = fromFunction(
			`const SIZES = ['sm', 'lg'] as const\n` + `function Foo({ sizes = SIZES }) { return null }`,
		)

		expect(extractDefaults(fn).get('sizes')).toBe(`['sm', 'lg']`)
	})

	it('keeps the identifier text when no same-file const resolves it', () => {
		const fn = fromFunction(`function Foo({ swatches = DEFAULT_SWATCHES }) { return null }`)

		expect(extractDefaults(fn).get('swatches')).toBe('DEFAULT_SWATCHES')
	})

	it('does not resolve identifiers that name non-literal consts', () => {
		const fn = fromFunction(
			`const DEFAULT_ICON = makeIcon()\nfunction Foo({ icon = DEFAULT_ICON }) { return null }`,
		)

		expect(extractDefaults(fn).get('icon')).toBe('DEFAULT_ICON')
	})

	it('does not resolve identifiers that name a mutable (let) binding', () => {
		const fn = fromFunction(`let MUTABLE = 'x'\nfunction Foo({ value = MUTABLE }) { return null }`)

		expect(extractDefaults(fn).get('value')).toBe('MUTABLE')
	})
})
