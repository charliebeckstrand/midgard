import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { extractDefaults } from '../../api-reference/engine/extract-defaults'

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
	it.each<[string, string, string, string]>([
		[
			'extracts a single string default from destructured parameters',
			`function Foo({ size = 'md' }) { return null }`,
			'size',
			`'md'`,
		],
		[
			'preserves the source text of complex default expressions verbatim',
			`function Foo({ items = [1, 2, 3] }) { return null }`,
			'items',
			'[1, 2, 3]',
		],
		[
			'handles arrow function initializers',
			`const Foo = ({ size = 'md' }) => null`,
			'size',
			`'md'`,
		],
		[
			'unwraps a forwardRef wrapper and reads its inner destructured defaults',
			`const Foo = forwardRef(({ size = 'md' }, ref) => null)`,
			'size',
			`'md'`,
		],
	])('%s', (_name, src, prop, expected) => {
		expect(extractDefaults(fromFunction(src)).get(prop)).toBe(expected)
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

	it('skips parameters that have no default initializer', () => {
		const fn = fromFunction(`function Foo({ size = 'md', label, color = 'zinc' }) { return null }`)

		const defaults = extractDefaults(fn)

		expect(defaults.has('size')).toBe(true)
		expect(defaults.has('color')).toBe(true)
		expect(defaults.has('label')).toBe(false)
	})

	it.each<[string, string]>([
		[
			'returns an empty map when the first parameter is not a destructure',
			`function Foo(props) { return null }`,
		],
		['returns an empty map when the function has no parameters', `function Foo() { return null }`],
	])('%s', (_name, src) => {
		expect(extractDefaults(fromFunction(src)).size).toBe(0)
	})
})

describe('extractDefaults — identifier defaults resolved to same-file const literals', () => {
	it.each<[string, string, string, string]>([
		[
			'resolves an identifier default to its same-file const string literal',
			`const DEFAULT_TRIGGER_SHORTCUT = '$mod+KeyK'\nfunction Foo({ triggerShortcut = DEFAULT_TRIGGER_SHORTCUT }) { return null }`,
			'triggerShortcut',
			`'$mod+KeyK'`,
		],
		[
			'unwraps `as const` when resolving a const literal',
			`const SIZES = ['sm', 'lg'] as const\nfunction Foo({ sizes = SIZES }) { return null }`,
			'sizes',
			`['sm', 'lg']`,
		],
		[
			'keeps the identifier text when no same-file const resolves it',
			`function Foo({ swatches = DEFAULT_SWATCHES }) { return null }`,
			'swatches',
			'DEFAULT_SWATCHES',
		],
		[
			'does not resolve identifiers that name non-literal consts',
			`const DEFAULT_ICON = makeIcon()\nfunction Foo({ icon = DEFAULT_ICON }) { return null }`,
			'icon',
			'DEFAULT_ICON',
		],
		[
			'does not resolve identifiers that name a mutable (let) binding',
			`let MUTABLE = 'x'\nfunction Foo({ value = MUTABLE }) { return null }`,
			'value',
			'MUTABLE',
		],
	])('%s', (_name, src, prop, expected) => {
		expect(extractDefaults(fromFunction(src)).get(prop)).toBe(expected)
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
})
