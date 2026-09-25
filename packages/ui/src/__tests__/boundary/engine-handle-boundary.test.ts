import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { srcDir } from '../helpers/walk-source'

// Engine-handle boundary (CONVENTIONS.md §10.7). The grid boundary holds two
// table objects. The table of the render changes with the options and the
// state, so a render read of it stays current, also when the React Compiler
// caches it. The engine handle keeps one identity, so a render read of it goes
// stale under the compiler. Render code therefore reads the table of the
// render, and only an action or an effect reads the handle.
//
// The suite follows the handle from its origin, `const [engine] = useState(…)`
// in `useGridTable`, through each function that receives it. In a function
// that runs during render, it allows a member read of the handle only in a
// deferred function. An eager function reads the handle in its own body, so
// each call to it must be in a deferred function. The handle can also go into
// a dependency list, or into a call to another receiver. Any other use of the
// handle is a leak, and the suite names it, so a new receiver joins the list
// below before it can read the handle.
//
// A function counts as deferred when it runs after the render: the callback of
// `useCallback` or of an effect, or a function that the code stores (an object
// property, a variable, a return value, or a JSX handler). A function that the
// code hands to another call, such as `.map`, runs at once, so it counts as
// render. A stored function that the render itself calls is out of reach of
// the scan.

/**
 * A function that receives the engine handle. `binding` is the name of the
 * handle inside the function.
 *
 * `render` runs during render: a hook, or a builder that a render calls. It
 * reads the handle only in a deferred function. `eager` reads the handle in its
 * own body, so each call to it must be in a deferred function.
 */
type Receiver = { file: string; fn: string; binding: string; kind: 'render' | 'eager' }

/** The origin of the handle. */
const ORIGIN: Receiver = {
	file: 'modules/grid/use-grid-table.ts',
	fn: 'useGridTable',
	binding: 'engine',
	kind: 'render',
}

/** Each function that receives the handle, after the origin. */
const RECEIVERS: Receiver[] = [
	ORIGIN,
	{ file: 'modules/grid/use-grid-table.ts', fn: 'useResizeView', binding: 'table', kind: 'render' },
	{ file: 'modules/grid/use-grid-table.ts', fn: 'useFilterView', binding: 'table', kind: 'render' },
	{ file: 'modules/grid/use-grid-table.ts', fn: 'exportLeaves', binding: 'table', kind: 'eager' },
	{
		file: 'modules/grid/use-grid-column-sizing.ts',
		fn: 'useGridColumnSizing',
		binding: 'table',
		kind: 'render',
	},
	{
		file: 'modules/grid/engine/grid-table/views.ts',
		fn: 'columnResizeActions',
		binding: 'table',
		kind: 'render',
	},
	{
		file: 'modules/grid/engine/grid-table/views.ts',
		fn: 'columnFilterActions',
		binding: 'table',
		kind: 'render',
	},
	{
		file: 'modules/grid/engine/grid-table/views.ts',
		fn: 'buildPaginationView',
		binding: 'table',
		kind: 'render',
	},
	{
		file: 'modules/grid/engine/grid-table/views.ts',
		fn: 'withResizeDirection',
		binding: 'table',
		kind: 'eager',
	},
]

/** The calls whose function argument runs after the render. */
const DEFERRING_CALLS = new Set([
	'useCallback',
	'useEffect',
	'useLayoutEffect',
	'useInsertionEffect',
	'useEffectEvent',
	'setTimeout',
	'requestAnimationFrame',
	'queueMicrotask',
])

/** The hooks that take a dependency list as their second argument. */
const DEPENDENCY_HOOKS = new Set([
	'useMemo',
	'useCallback',
	'useEffect',
	'useLayoutEffect',
	'useInsertionEffect',
])

/** The name of the function that a call calls, when the callee is a plain name. */
function calleeName(call: ts.CallExpression): string | undefined {
	return ts.isIdentifier(call.expression) ? call.expression.text : undefined
}

/**
 * Whether `node` runs after the render of `fn`. The walk goes up from `node`
 * to `fn`. The first function that the code stores, or that it hands to a
 * deferring call, makes the node deferred.
 */
function isDeferred(node: ts.Node, fn: ts.Node): boolean {
	for (let current = node.parent; current && current !== fn; current = current.parent) {
		if (!ts.isFunctionLike(current)) continue

		const parent = current.parent

		if (ts.isCallExpression(parent) && parent.arguments.includes(current as ts.Expression)) {
			if (DEFERRING_CALLS.has(calleeName(parent) ?? '')) return true

			// A function handed to any other call runs at once, in the render.
			continue
		}

		return true
	}

	return false
}

/** The function declaration named `name` in a source file. */
function findFunction(source: ts.SourceFile, name: string): ts.FunctionDeclaration | undefined {
	let found: ts.FunctionDeclaration | undefined

	const visit = (node: ts.Node): void => {
		if (ts.isFunctionDeclaration(node) && node.name?.text === name) found = node
		else ts.forEachChild(node, visit)
	}

	visit(source)

	return found
}

/** The symbol of the binding named `name` that `fn` declares in its own scope. */
function bindingSymbol(
	checker: ts.TypeChecker,
	fn: ts.FunctionDeclaration,
	name: string,
): ts.Symbol | undefined {
	let symbol: ts.Symbol | undefined

	const visit = (node: ts.Node): void => {
		if (node !== fn && ts.isFunctionLike(node)) return

		if (
			(ts.isParameter(node) || ts.isVariableDeclaration(node) || ts.isBindingElement(node)) &&
			ts.isIdentifier(node.name) &&
			node.name.text === name
		) {
			symbol = checker.getSymbolAtLocation(node.name)
		}

		ts.forEachChild(node, visit)
	}

	visit(fn)

	return symbol
}

/** Whether `node` is the name of a declaration, not a read of the binding. */
function isDeclarationName(node: ts.Identifier): boolean {
	const parent = node.parent

	return (
		(ts.isParameter(parent) || ts.isVariableDeclaration(parent) || ts.isBindingElement(parent)) &&
		parent.name === node
	)
}

/** One use of the handle that the rule does not allow. */
type Violation = { file: string; fn: string; line: number; text: string; reason: string }

/** The result of a scan: the violations, and the receivers that the handle reached. */
type Scan = { violations: Violation[]; reached: Set<string> }

/**
 * Follows the handle from the origin through each receiver, and lists each
 * use that the rule does not allow.
 *
 * @param program - A program over the files of the receivers.
 * @param receivers - The receivers, the origin first.
 * @param path - Maps a receiver file to the path of its source in `program`.
 */
function scanHandle(
	program: ts.Program,
	receivers: Receiver[],
	path: (file: string) => string,
): Scan {
	const checker = program.getTypeChecker()

	const byName = new Map(receivers.map((receiver) => [receiver.fn, receiver]))

	const violations: Violation[] = []

	const reached = new Set<string>([receivers[0]?.fn ?? ''])

	for (const receiver of receivers) {
		const source = program.getSourceFile(path(receiver.file))

		const fn = source && findFunction(source, receiver.fn)

		const report = (node: ts.Node, reason: string) => {
			const at = node.getSourceFile()

			violations.push({
				file: receiver.file,
				fn: receiver.fn,
				line: at.getLineAndCharacterOfPosition(node.getStart(at)).line + 1,
				text: node.getText(at),
				reason,
			})
		}

		if (!source || !fn) {
			violations.push({ ...receiver, line: 0, text: '', reason: 'the function is not in the file' })

			continue
		}

		const handle = bindingSymbol(checker, fn, receiver.binding)

		if (!handle) {
			report(fn.name ?? fn, `the function declares no \`${receiver.binding}\``)

			continue
		}

		/** Checks a flow of the handle into a call to another function. */
		const checkCall = (call: ts.CallExpression, use: ts.Node, property?: string) => {
			const target = byName.get(calleeName(call) ?? '')

			if (!target) {
				report(use, 'the handle goes into a function that this suite does not follow')

				return
			}

			if (property !== undefined && property !== target.binding) {
				report(use, `the handle goes into \`${property}\`, not \`${target.binding}\``)

				return
			}

			reached.add(target.fn)

			if (target.kind === 'eager' && !isDeferred(call, fn)) {
				report(call, `\`${target.fn}\` reads the handle at once, and the render calls it`)
			}
		}

		const visit = (node: ts.Node): void => {
			ts.forEachChild(node, visit)

			if (!ts.isIdentifier(node) || node.text !== receiver.binding || isDeclarationName(node)) {
				return
			}

			const parent = node.parent

			const symbol = ts.isShorthandPropertyAssignment(parent)
				? checker.getShorthandAssignmentValueSymbol(parent)
				: checker.getSymbolAtLocation(node)

			if (symbol !== handle) return

			// A member read: `engine.getColumn(…)`.
			if (
				(ts.isPropertyAccessExpression(parent) || ts.isElementAccessExpression(parent)) &&
				parent.expression === node
			) {
				if (receiver.kind === 'render' && !isDeferred(node, fn)) {
					report(parent, 'the render reads the handle')
				}

				return
			}

			// A dependency list of a hook.
			if (
				ts.isArrayLiteralExpression(parent) &&
				ts.isCallExpression(parent.parent) &&
				DEPENDENCY_HOOKS.has(calleeName(parent.parent) ?? '') &&
				parent.parent.arguments[1] === parent
			) {
				return
			}

			// An argument: `columnResizeActions(table, floors)`.
			if (ts.isCallExpression(parent) && parent.arguments.includes(node)) {
				const target = byName.get(calleeName(parent) ?? '')

				const index = parent.arguments.indexOf(node)

				const param = target && findFunction(source, target.fn)?.parameters[index]

				if (target && param && ts.isIdentifier(param.name) && param.name.text !== target.binding) {
					report(node, `the handle goes into \`${param.name.text}\`, not \`${target.binding}\``)

					return
				}

				checkCall(parent, node)

				return
			}

			// A property of an argument: `useResizeView({ table: engine })`.
			const property = ts.isShorthandPropertyAssignment(parent)
				? parent
				: ts.isPropertyAssignment(parent) && parent.initializer === node
					? parent
					: undefined

			const literal = property?.parent

			if (
				property &&
				literal &&
				ts.isObjectLiteralExpression(literal) &&
				ts.isCallExpression(literal.parent) &&
				literal.parent.arguments.includes(literal)
			) {
				checkCall(literal.parent, node, property.name.getText())

				return
			}

			report(node, 'the handle leaks')
		}

		visit(fn)
	}

	return { violations, reached }
}

/** A program over the files of the receivers, with no library and no import resolution. */
function sourceProgram(files: Map<string, string>): ts.Program {
	const options: ts.CompilerOptions = {
		target: ts.ScriptTarget.ESNext,
		module: ts.ModuleKind.ESNext,
		jsx: ts.JsxEmit.Preserve,
		noLib: true,
		noResolve: true,
	}

	const host = ts.createCompilerHost(options)

	host.getSourceFile = (fileName, languageVersion) => {
		const text = files.get(fileName)

		return text === undefined
			? undefined
			: ts.createSourceFile(fileName, text, languageVersion, true)
	}

	host.fileExists = (fileName) => files.has(fileName)

	host.readFile = (fileName) => files.get(fileName)

	return ts.createProgram([...files.keys()], options, host)
}

/** The scan of the real grid source. */
function scanSource(): Scan {
	const files = new Map(
		[...new Set(RECEIVERS.map((receiver) => receiver.file))].map((file) => {
			const path = join(srcDir, file)

			return [path, readFileSync(path, 'utf8')] as const
		}),
	)

	return scanHandle(sourceProgram(files), RECEIVERS, (file) => join(srcDir, file))
}

/** One line for each violation, for a readable failure. */
function lines(violations: Violation[]): string[] {
	return violations.map((v) => `${v.file}:${v.line} ${v.fn}: ${v.reason} — ${v.text}`)
}

describe('engine-handle boundary', () => {
	const scan = scanSource()

	it('reads the engine handle only when an action or an effect runs', () => {
		expect(lines(scan.violations)).toEqual([])
	})

	it('lists no receiver that the handle does not reach', () => {
		const stale = RECEIVERS.filter((receiver) => !scan.reached.has(receiver.fn)).map(
			(receiver) => receiver.fn,
		)

		expect(stale).toEqual([])
	})

	// The scan must fail each kind of break, or a pass means nothing.
	it('finds each kind of break in a fixture', () => {
		const file = 'fixture.ts'

		const source = `
			function useGrid() {
				const [engine] = useState(() => table)
				const now = engine.getRowModel()
				const cells = columns.map((col) => engine.getColumn(col.id))
				const later = useCallback(() => engine.setGlobalFilter(''), [engine])
				const view = useMemo(() => ({ open: () => engine.getColumn('a') }), [engine])
				const copy = engine
				unknownHelper(engine)
				readNow(engine)
				const run = useCallback(() => readNow(engine), [engine])
				useView({ other: engine })
			}
			function readNow(table) { return table.getRowModel() }
			function useView(args) { const { table } = args; return table }
		`

		const receivers: Receiver[] = [
			{ file, fn: 'useGrid', binding: 'engine', kind: 'render' },
			{ file, fn: 'readNow', binding: 'table', kind: 'eager' },
			{ file, fn: 'useView', binding: 'table', kind: 'render' },
		]

		const { violations } = scanHandle(
			sourceProgram(new Map([[file, source]])),
			receivers,
			(name) => name,
		)

		expect(violations.map((v) => `${v.fn}: ${v.reason}`)).toEqual([
			'useGrid: the render reads the handle',
			'useGrid: the render reads the handle',
			'useGrid: the handle leaks',
			'useGrid: the handle goes into a function that this suite does not follow',
			'useGrid: `readNow` reads the handle at once, and the render calls it',
			'useGrid: the handle goes into `other`, not `table`',
			'useView: the handle leaks',
		])
	})
})
