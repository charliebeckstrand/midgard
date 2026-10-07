import { readFileSync, statSync } from 'node:fs'
import { dirname, join, sep } from 'node:path'
import {
	type BindingName,
	type DoStatement,
	type Expression,
	type ForInStatement,
	type ForOfStatement,
	type ForStatement,
	type FunctionDeclaration,
	isArrowFunction,
	isAsExpression,
	isAwaitExpression,
	isBinaryExpression,
	isBlock,
	isCallExpression,
	isCaseClause,
	isCatchClause,
	isClassDeclaration,
	isClassExpression,
	isDefaultClause,
	isDeleteExpression,
	isDoStatement,
	isElementAccessExpression,
	isEnumDeclaration,
	isExportDeclaration,
	isForInStatement,
	isForOfStatement,
	isForStatement,
	isFunctionDeclaration,
	isFunctionExpression,
	isIdentifier,
	isImportDeclaration,
	isImportEqualsDeclaration,
	isModuleBlock,
	isModuleDeclaration,
	isNamedExports,
	isNamedImports,
	isNamespaceImport,
	isNonNullExpression,
	isOmittedExpression,
	isParenthesizedExpression,
	isPropertyAccessExpression,
	isSourceFile as isSourceFileNode,
	isStringLiteral,
	isVariableDeclarationList,
	isVariableStatement,
	isWhileStatement,
	type Node,
	NodeFlags,
	type SourceFile,
	type Statement,
	SyntaxKind,
	type VariableStatement,
	type WhileStatement,
} from 'typescript/unstable/ast'
import { afterAll, describe, expect, it } from 'vitest'
import { isFunctionLike } from '../helpers/ts-ast'
import { startTypeScript, type TypeScriptServer } from '../helpers/ts-server'
import {
	collectPatternViolations,
	docsTestDir,
	isSourceFile,
	srcDir,
	srcRelative,
	stripSourceComments,
	walkSource,
} from '../helpers/walk-source'

// A project that runs `isolate: false` shares one module registry across every
// file a worker runs; vitest.config.ts records what that buys. Two calls break
// it, and neither fails the file that declares it: a per-file mock reaches
// whichever files `sequence.shuffle` schedules next, and `vi.resetModules()`
// drops a graph they must rebuild. Global doubles belong in `setup/`, which
// runs for every file; a suite that needs its own mock belongs in `boundary/`,
// which the `integration` project runs on forks. `mocks/shiki.ts` records the
// one time this suite paid the bill.

const testsDir = join(srcDir, '__tests__')

// `browser/` runs under vitest.browser.config.ts and is scanned on its own
// below; `setup/` is the sanctioned home for a global mock. `boundary/` is
// split: its `*-boundary` files share a registry and are scanned below, the
// rest run on forks.
const SHARED_REGISTRY_SKIP = new Set(['boundary', 'browser', 'setup'])

// The `unit` project's whole test tree — not only `*.test.*`, since a mock in a
// helper reaches the same registry — the docs suites it also runs, the
// `boundary` project's own files, and the browser suite, whose instances
// share one page each (`isolate: false` in vitest.browser.config.ts). Its
// per-instance doubles live in a `setup/` directory at either depth, which
// `skip` prunes by entry name.
const SHARED_REGISTRY_SCANS = [
	{ dir: testsDir, skip: SHARED_REGISTRY_SKIP },
	{ dir: docsTestDir },
	// The `boundary` and `workspace` projects: each `-boundary` suite.
	{ dir: join(testsDir, 'boundary'), fileFilter: /-boundary\.test\.ts$/ },
	{ dir: join(testsDir, 'browser'), skip: new Set(['setup']) },
]

// `vitest` is a global alias for `vi` under `globals: true`, so both spellings
// reach the same registry. A call can have a type argument, and white space
// can come before the dot, after the dot, or before the parenthesis.
const FORBIDDEN_PATTERNS = [
	{
		label: 'per-file module mock',
		regex: /\b(?:vi|vitest)\s*\.\s*(?:mock|doMock|unmock|doUnmock)\s*[<(]/g,
	},
	{ label: 'module registry reset', regex: /\b(?:vi|vitest)\s*\.\s*resetModules\s*[<(]/g },
] as const

// The browser instances share one page, and `page.viewport` writes to it. A
// call inside an `it` reaches every later case in the same file and nothing
// can restore it there. A call in a `beforeAll` states the width before any
// case runs. Vitest resets the page to `browser.viewport` before each file, so
// nothing crosses a file boundary and no departure hook is needed.
//
// A `beforeAll` has the scope of its block, so a sibling block with no hook of
// its own runs at the width the block above it left. That is how one block in
// `chart-aspect-legend` came to pass on a width that it never stated. So a file
// states its width once at file level, or at the head of each top-level block;
// `unstatedViewports` below holds that half.
const LOOSE_VIEWPORT = {
	label: 'viewport set outside a beforeAll',
	regex: /^(?!\s*beforeAll\(\(\) => page\.viewport\().*page\.viewport\(.*$/gm,
} as const

/** A viewport hook at file level, which covers every block in the file. */
const FILE_VIEWPORT = /^beforeAll\(\(\) => page\.viewport\(/m

/** A viewport hook at the head of a top-level block. */
const BLOCK_VIEWPORT = /^\tbeforeAll\(\(\) => page\.viewport\(/m

// A hook in a nested block changes the width for its block only while that
// block runs. The shuffle can run a sibling block after it, and that sibling
// then runs at the width of the nested hook. So a hook goes at file level or
// at the head of a top-level block, and at no lower level.
const NESTED_VIEWPORT = {
	label: 'viewport set in a nested block',
	regex: /^\t{2,}beforeAll\(\(\) => page\.viewport\(.*$/gm,
} as const

/**
 * The top-level blocks of a browser file that set the viewport at block level,
 * where one of them has no hook of its own. Each is named by its title.
 */
function unstatedViewports(text: string): string[] {
	if (!/page\.viewport\(/.test(text) || FILE_VIEWPORT.test(text)) return []

	return text
		.split(/^(?=describe\b)/m)
		.slice(1)
		.filter((block) => !BLOCK_VIEWPORT.test(block))
		.map((block) => block.slice(0, block.indexOf('\n')))
}

// `bySlot` and `querySelector` both return null, and a cast that says otherwise
// moves the miss to whatever reads the result next: a `getBoundingClientRect`
// on null, or a `fireEvent` that reports only that it got no element. That is
// how the suite's most frequent intermittent failure read for twelve runs
// before it was root-caused. `getSlot` states the slot name once and throws at
// the query; `present` does the same for any other lookup. A cast to `T | null`
// keeps the null and is honest, so it passes. The query can take a type
// argument, and its arguments can span lines, because Biome wraps a long
// query. They can hold one level of parentheses.
const NULLABLE_CAST = {
	label: 'non-null cast over a nullable query',
	regex:
		/(?:bySlot|querySelector(?:All)?)(?:<[^<>]*>)?\((?:[^()]|\([^()]*\))*\)\s+as\s+(?:HTML|SVG)[A-Za-z]*Element(?!\s*\|)/g,
} as const

// CONVENTIONS.md §10.9. A case that runs longer than `testTimeout` fails, but
// its body does not stop. JavaScript cannot cancel a pending promise, so the
// body continues at its next `await` while a later case runs.
// `code-block-load-shiki` recorded one such body: it registered a failing
// `shiki` double under the case after it. Vitest aborts the `signal` of the
// test context before it starts the next case. Thus a
// `signal.throwIfAborted()` after the last `await` stops the late write.
//
// The rule applies to a write to state that outlives the case: the module
// registry, a global, the environment, the clock, the mock registry, a spy on
// a global or a prototype, and a module-scope `let`. A global includes a
// constructor or a namespace, such as `URL` or `Math`, because a static on it
// outlives the case. A `const` that holds a global or a prototype counts as
// that global. The type check resolves each name that no scope around the
// write declares to a global, so the scan needs no list of globals. A call
// that writes through a method needs a list: `GLOBAL_WRITE_CALL` names the
// calls on a global object, and `MOCK_WRITE_METHOD` names the calls that
// change an imported mock.
//
// A helper that makes such a write counts as one. The scan reads the helpers
// of the file, and the modules in a `__tests__` tree that the file imports,
// with the same rules. It does not read the source tree, so `SOURCE_WRITERS`
// names each reset seam there. Another write to the DOM is out of scope:
// `cleanup`, the residue guard, and the page reset of the browser suite undo
// it. In a
// loop, an `await` lower in the body comes before the write of the next pass,
// so the scan counts the head of the loop body as a resume point.

/** The `vi` calls that change state that outlives a case. */
const SHARED_STATE_CALL =
	/^(?:vi|vitest)\.(?:doMock|doUnmock|stubGlobal|stubEnv|resetModules|useFakeTimers|useRealTimers|setSystemTime|restoreAllMocks|resetAllMocks|unstubAllGlobals|unstubAllEnvs)$/

/**
 * The calls on a global object that change state that outlives a case: web
 * storage, the session history, and the attributes, classes, and style of the
 * root and body elements. `cleanup` does not undo them. The residue guard does
 * not read storage or history. It reads the root and the body, but it blames a
 * late write on the case that runs at that time. A leading `window.`,
 * `globalThis.`, or `self.` is removed before the match.
 */
const GLOBAL_WRITE_CALL =
	/^(?:(?:localStorage|sessionStorage)\.(?:setItem|removeItem|clear)|history\.(?:pushState|replaceState|back|forward|go)|document\.(?:documentElement|body)\.(?:(?:set|remove|toggle)Attribute(?:NS)?|classList\.(?:add|remove|toggle|replace)|style\.(?:setProperty|removeProperty)))$/

/** The global names that a callee can start with before the global object. */
const GLOBAL_SCOPE = /^(?:window|globalThis|self)\./

/**
 * The calls that change the implementation of a mock. `clearMocks` keeps an
 * implementation, so a change to a mock that a module exports outlives the
 * case and reaches each file that imports the mock.
 */
const MOCK_WRITE_METHOD =
	/^(?:mock(?:Implementation|ReturnValue|ResolvedValue|RejectedValue)(?:Once)?|mockReturnThis|mockReset|mockRestore)$/

/** A prototype, which every case shares. */
const PROTOTYPE = /^[\w.]+\.prototype\b/

/** The calls that take the body of a case or of a hook. */
const CASE_OR_HOOK = new Set(['it', 'test', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'])

/** The identifier at the root of a callee: `it` for `it.each(rows)`. */
function calleeRoot(node: Expression): string | undefined {
	if (isIdentifier(node)) return node.text

	if (isPropertyAccessExpression(node) || isCallExpression(node)) {
		return calleeRoot(node.expression)
	}

	return undefined
}

/** The expression under its parentheses and casts. */
function uncast(node: Expression): Expression {
	return isParenthesizedExpression(node) || isAsExpression(node) || isNonNullExpression(node)
		? uncast(node.expression)
		: node
}

/** Whether `node` is a loop, whose body runs again after an `await` lower in it. */
function isLoop(
	node: Node,
): node is DoStatement | ForInStatement | ForOfStatement | ForStatement | WhileStatement {
	return (
		isForStatement(node) ||
		isForOfStatement(node) ||
		isForInStatement(node) ||
		isWhileStatement(node) ||
		isDoStatement(node)
	)
}

/**
 * The root of an assignment target, under its casts: `globalThis` for
 * `(globalThis as T).fetch`.
 */
function targetRoot(node: Expression): Expression {
	const bare = uncast(node)

	return isPropertyAccessExpression(bare) || isElementAccessExpression(bare)
		? targetRoot(bare.expression)
		: bare
}

/** Whether `name` is one of the names that a binding or a pattern binds. */
function bindsName(binding: BindingName, name: string): boolean {
	return isIdentifier(binding)
		? binding.text === name
		: binding.elements.some(
				(element) =>
					!isOmittedExpression(element) &&
					element.name !== undefined &&
					bindsName(element.name, name),
			)
}

/** Whether a statement of a block or of a module declares `name`. */
function statementDeclares(statement: Statement, name: string): boolean {
	if (isVariableStatement(statement)) {
		return statement.declarationList.declarations.some((declaration) =>
			bindsName(declaration.name, name),
		)
	}

	if (isImportDeclaration(statement)) {
		const clause = statement.importClause

		const bindings = clause?.namedBindings

		return (
			clause?.name?.text === name ||
			(bindings !== undefined &&
				(isNamespaceImport(bindings)
					? bindings.name.text === name
					: bindings.elements.some((element) => element.name.text === name)))
		)
	}

	return (
		(isFunctionDeclaration(statement) ||
			isClassDeclaration(statement) ||
			isEnumDeclaration(statement) ||
			isModuleDeclaration(statement) ||
			isImportEqualsDeclaration(statement)) &&
		statement.name !== undefined &&
		isIdentifier(statement.name) &&
		statement.name.text === name
	)
}

/**
 * The nearest scope around `node` that declares `name`: a block, a module, a
 * function, a loop head, or a `catch`. For a block or a module, the result is
 * the statement that declares the name. A `var` in a nested block is not read.
 */
function declarationAround(node: Node, name: string): Node | undefined {
	for (let up = node.parent; up; up = up.parent) {
		if (
			isBlock(up) ||
			isSourceFileNode(up) ||
			isModuleBlock(up) ||
			isCaseClause(up) ||
			isDefaultClause(up)
		) {
			const statement = up.statements.find((statement) => statementDeclares(statement, name))

			if (statement) return statement
		}

		if (isFunctionLike(up)) {
			if (up.parameters.some((parameter) => bindsName(parameter.name, name))) return up

			if (isFunctionExpression(up) && up.name?.text === name) return up
		}

		if (
			(isForStatement(up) || isForOfStatement(up) || isForInStatement(up)) &&
			up.initializer &&
			isVariableDeclarationList(up.initializer) &&
			up.initializer.declarations.some((declaration) => bindsName(declaration.name, name))
		) {
			return up
		}

		if (isCatchClause(up) && up.variableDeclaration) {
			if (bindsName(up.variableDeclaration.name, name)) return up
		}

		if (isClassExpression(up) && up.name?.text === name) return up
	}

	return undefined
}

/**
 * The value of `name` when a `const` declares it as a plain name, such as `p`
 * in `const p = X.prototype`. Otherwise `undefined`.
 */
function constValue(declaration: Node | undefined, name: string): Expression | undefined {
	if (
		!declaration ||
		!isVariableStatement(declaration) ||
		(declaration.declarationList.flags & NodeFlags.Const) === 0
	) {
		return undefined
	}

	return declaration.declarationList.declarations.find(
		(item) => isIdentifier(item.name) && item.name.text === name,
	)?.initializer
}

/**
 * The functions of the source tree that reset module-scope state, by module.
 * The scan reads no module of the source tree: a cache there changes in forms
 * that `writeLabel` does not see, such as a `clear()` on a module-scope `Map`.
 * The other writes to module scope in the source tree are caches that a
 * render fills and registries that an unmount empties, and a case does not
 * call them to change state. Add a reset seam here when you export one.
 */
const SOURCE_WRITERS: Readonly<Record<string, readonly string[]>> = {
	'components/pdf-viewer/pdf-viewer-document-cache.ts': ['resetDocumentCache'],
	'core/announcer.ts': ['__resetAnnouncer'],
	'hooks/use-truncation.ts': ['__resetTruncationObserver'],
}

/** Each name in `SOURCE_WRITERS`. */
const SOURCE_WRITER_NAMES = new Set(Object.values(SOURCE_WRITERS).flat())

/** The resolved file of each import path that the scan read. */
const resolvedImports = new Map<string, string | undefined>()

/** The file that a relative import names, or `undefined` for a package import. */
function resolveImport(from: string, specifier: string): string | undefined {
	if (!specifier.startsWith('.')) return undefined

	const base = join(dirname(from), specifier)

	if (!resolvedImports.has(base)) {
		resolvedImports.set(
			base,
			[`${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx'), base].find(
				(candidate) => statSync(candidate, { throwIfNoEntry: false })?.isFile(),
			),
		)
	}

	return resolvedImports.get(base)
}

/** Whether `path` is in a `__tests__` tree. */
function inTestTree(path: string): boolean {
	return path.includes(`${sep}__tests__${sep}`)
}

/** The parse of a module, by its path. */
type Parse = (file: string) => SourceFile

/**
 * The parse of each module that the scan reads. The files in `files` go into
 * one project. A module that `files` does not hold goes into a project of its
 * own.
 */
function parser(server: TypeScriptServer, files: readonly string[]): Parse {
	const sources = server.parse(files)

	return (file) => {
		const source = sources.get(file) ?? server.parse([file]).get(file)

		if (!source) throw new Error(`the TypeScript server did not parse ${file}`)

		return source
	}
}

/** The exported writers of each module that the scan read, by file. */
const exportedWritersByFile = new Map<string, Set<string>>()

/**
 * The names that a module exports and that write shared state. A module in a
 * `__tests__` tree is read with the rules of a test file. A module of the
 * source tree gives the names in `SOURCE_WRITERS`.
 */
function exportedWriters(file: string, parse: Parse): Set<string> {
	if (!inTestTree(file)) {
		return new Set(SOURCE_WRITERS[srcRelative(file)] ?? [])
	}

	const cached = exportedWritersByFile.get(file)

	if (cached) return cached

	const exported = new Set<string>()

	// An import cycle reads the empty set until this module is complete.
	exportedWritersByFile.set(file, exported)

	const { source, writers } = scanModule(file, parse)

	const isExported = (node: FunctionDeclaration | VariableStatement) =>
		node.modifiers?.some((modifier) => modifier.kind === SyntaxKind.ExportKeyword) ?? false

	for (const statement of source.statements) {
		if (isFunctionDeclaration(statement) && statement.name && isExported(statement)) {
			if (writers.has(statement.name.text)) exported.add(statement.name.text)
		}

		if (isVariableStatement(statement) && isExported(statement)) {
			for (const { name } of statement.declarationList.declarations) {
				if (isIdentifier(name) && writers.has(name.text)) exported.add(name.text)
			}
		}

		if (!isExportDeclaration(statement) || statement.isTypeOnly) continue

		const specifier = statement.moduleSpecifier

		const target =
			specifier && isStringLiteral(specifier) ? resolveImport(file, specifier.text) : undefined

		// A re-export from a package, such as `@testing-library/react`.
		if (specifier && !target) continue

		const from = target ? exportedWriters(target, parse) : writers

		const clause = statement.exportClause

		if (!clause) {
			for (const name of from) exported.add(name)
		} else if (isNamedExports(clause)) {
			for (const element of clause.elements) {
				if (from.has((element.propertyName ?? element.name).text)) exported.add(element.name.text)
			}
		}
	}

	return exported
}

/**
 * The parts of a module that the scan reads. `writers` holds each function of
 * the module that writes shared state, and each import of a writer.
 */
function scanModule(file: string, parse: Parse) {
	const source = parse(file)

	const moduleLets = new Set<string>()

	const functions = new Map<string, Node>()

	const writers = new Set<string>()

	for (const statement of source.statements) {
		const bindings = isImportDeclaration(statement)
			? statement.importClause?.namedBindings
			: undefined

		if (
			isImportDeclaration(statement) &&
			isStringLiteral(statement.moduleSpecifier) &&
			statement.importClause?.phaseModifier !== SyntaxKind.TypeKeyword &&
			bindings &&
			isNamedImports(bindings)
		) {
			const specifier = statement.moduleSpecifier.text

			const names = bindings.elements.filter((element) => !element.isTypeOnly)

			// Resolve only an import that can give a writer. The other imports
			// need no stat.
			const target =
				inTestTree(`${join(dirname(file), specifier)}${sep}`) ||
				names.some((element) =>
					SOURCE_WRITER_NAMES.has((element.propertyName ?? element.name).text),
				)
					? resolveImport(file, specifier)
					: undefined

			const imported = target ? exportedWriters(target, parse) : new Set<string>()

			for (const element of names) {
				if (imported.has((element.propertyName ?? element.name).text))
					writers.add(element.name.text)
			}
		}

		if (isFunctionDeclaration(statement) && statement.name && statement.body) {
			functions.set(statement.name.text, statement.body)
		}

		if (!isVariableStatement(statement)) continue

		const isLet = (statement.declarationList.flags & NodeFlags.Let) !== 0

		for (const declaration of statement.declarationList.declarations) {
			if (!isIdentifier(declaration.name)) continue

			if (isLet) moduleLets.add(declaration.name.text)

			const init = declaration.initializer

			if (init && (isArrowFunction(init) || isFunctionExpression(init))) {
				functions.set(declaration.name.text, init.body)
			}
		}
	}

	/**
	 * Whether a write to `target` reaches state that every case shares: a
	 * prototype, a name that no scope around it declares, such as `URL`, or a
	 * `const` that holds one of these, such as `p` in `const p = X.prototype`.
	 */
	function isSharedTarget(target: Expression, depth = 0): boolean {
		if (PROTOTYPE.test(target.getText())) return true

		const root = targetRoot(target)

		if (!isIdentifier(root)) return false

		const declaration = declarationAround(root, root.text)

		if (!declaration) return true

		const value = constValue(declaration, root.text)

		// The limit stops a cycle of names, which only code that throws can make.
		return value !== undefined && depth < 8 && isSharedTarget(value, depth + 1)
	}

	/**
	 * Whether `mock` is a mock that a module exports: the root of `mock`, or of
	 * the argument of `vi.mocked(mock)`, is an import.
	 */
	function isImportedMock(mock: Expression): boolean {
		const bare = uncast(mock)

		const inner =
			isCallExpression(bare) &&
			/^(?:vi|vitest)\.mocked$/.test(bare.expression.getText()) &&
			bare.arguments[0]
				? bare.arguments[0]
				: bare

		const root = targetRoot(inner)

		if (!isIdentifier(root)) return false

		const declaration = declarationAround(root, root.text)

		return declaration !== undefined && isImportDeclaration(declaration)
	}

	/** The label of a write to shared state, or `undefined` for any other node. */
	function writeLabel(node: Node): string | undefined {
		if (isCallExpression(node)) {
			const callee = node.expression.getText()

			if (SHARED_STATE_CALL.test(callee)) return callee

			const [target] = node.arguments

			if (/^(?:vi|vitest)\.spyOn$/.test(callee) && target && isSharedTarget(target)) {
				return `${callee}(${target.getText()})`
			}

			if (
				/^(?:Object|Reflect)\.(?:assign|defineProperty|defineProperties|set|deleteProperty)$/.test(
					callee,
				) &&
				target &&
				isSharedTarget(target)
			) {
				return `${callee}(${target.getText()})`
			}

			if (isIdentifier(node.expression) && writers.has(callee)) return `${callee}()`

			const method = uncast(node.expression)

			if (
				GLOBAL_WRITE_CALL.test(callee.replace(GLOBAL_SCOPE, '')) &&
				isPropertyAccessExpression(method) &&
				isSharedTarget(method.expression)
			) {
				return `${callee}()`
			}

			if (
				isPropertyAccessExpression(method) &&
				MOCK_WRITE_METHOD.test(method.name.text) &&
				isImportedMock(method.expression)
			) {
				return `${callee}()`
			}
		}

		if (isDeleteExpression(node) && isSharedTarget(node.expression)) {
			return `delete ${node.expression.getText()}`
		}

		if (
			isBinaryExpression(node) &&
			node.operatorToken.kind >= SyntaxKind.FirstAssignment &&
			node.operatorToken.kind <= SyntaxKind.LastAssignment
		) {
			const root = targetRoot(node.left)

			if (isIdentifier(root) && moduleLets.has(root.text) && root === node.left) {
				return `${root.text} =`
			}

			if (root !== node.left && isSharedTarget(node.left)) {
				return `${node.left.getText()} =`
			}
		}

		return undefined
	}

	function containsWrite(node: Node): boolean {
		return writeLabel(node) !== undefined || (node.forEachChild(containsWrite) ?? false)
	}

	// A helper can call another helper, so repeat until the set is stable.
	for (let grew = true; grew; ) {
		grew = false

		for (const [name, body] of functions) {
			if (!writers.has(name) && containsWrite(body)) {
				writers.add(name)

				grew = true
			}
		}
	}

	return { source, writers, writeLabel }
}

/**
 * The late writes of one file: each write to shared state in a case or a hook
 * that comes after an `await`, with no `throwIfAborted()` between the latest
 * `await` and the write.
 */
function unguardedLateWrites(file: string, parse: Parse): string[] {
	const { source, writeLabel } = scanModule(file, parse)

	const late: string[] = []

	function scanBody(body: Node) {
		const awaits: number[] = []

		const guards: number[] = []

		const writes: { at: number; label: string; node: Node }[] = []

		const visit = (node: Node) => {
			node.forEachChild(visit)

			if (isAwaitExpression(node)) awaits.push(node.getEnd())

			if (isCallExpression(node) && /\.throwIfAborted$/.test(node.expression.getText())) {
				guards.push(node.getStart())
			}

			const label = writeLabel(node)

			if (label) writes.push({ at: node.getStart(), label, node })
		}

		visit(body)

		/**
		 * The latest point before `at` where the body can resume. An `await` that
		 * holds the write ends after it, so it does not count. In a loop, an
		 * `await` lower in the body comes before the write of the next pass, so
		 * the pass starts at the head of the loop body.
		 */
		function resumedBefore(node: Node, at: number): number {
			let resumed = Math.max(-1, ...awaits.filter((end) => end <= at))

			for (let up = node.parent; up && up !== body; up = up.parent) {
				if (!isLoop(up)) continue

				const loopBody = up.statement

				const start = loopBody.getStart()

				if (awaits.some((end) => end > at && end <= loopBody.getEnd())) {
					resumed = Math.max(resumed, start)
				}
			}

			return resumed
		}

		for (const { at, label, node } of writes) {
			const resumed = resumedBefore(node, at)

			if (resumed < 0 || guards.some((guard) => guard >= resumed && guard < at)) continue

			const line = source.getLineAndCharacterOfPosition(at).line + 1

			late.push(`${srcRelative(file)}:${line} → ${label}`)
		}
	}

	function visit(node: Node) {
		if (isCallExpression(node) && CASE_OR_HOOK.has(calleeRoot(node.expression) ?? '')) {
			const body = node.arguments.findLast(
				(arg) => isArrowFunction(arg) || isFunctionExpression(arg),
			)

			if (body) {
				scanBody(body)

				return
			}
		}

		node.forEachChild(visit)
	}

	visit(source)

	return late
}

describe('test isolation boundary', () => {
	const server = startTypeScript()

	afterAll(() => server.close())
	it('no file in a shared-registry project mutates the module registry', () => {
		const violations = SHARED_REGISTRY_SCANS.flatMap((scan) =>
			collectPatternViolations({ patterns: FORBIDDEN_PATTERNS, stripComments: true, ...scan }),
		)

		expect(
			violations,
			`these projects share one module registry (isolate: false) — mock globally in setup/module-mocks.ts, or move the suite to boundary/ so it runs on forks:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	// The scans above enumerate the projects that share a registry. That set
	// lives in vitest.config.ts and can change with no signal here, which would
	// leave this gate guarding a registry it no longer covers. Read the config as
	// text rather than import it: an import runs the config, and its walk of the
	// test tree, in a test worker.
	it('covers every project that shares a module registry', () => {
		const config = readFileSync(join(srcDir, '..', 'vitest.config.ts'), 'utf8')

		const shared = config
			.split(/name: '/)
			.slice(1)
			// Anchored to the option, not to prose: the comment above `isolate` in
			// each project names the option too, and an unanchored test matches it
			// — which passes green with the option itself deleted.
			.filter((block) => /^\s*isolate: false/m.test(block))
			.map((block) => block.slice(0, block.indexOf("'")))

		expect(
			shared.sort(),
			'a project changed its isolation, or vitest.config.ts no longer matches the text shape this gate parses — extend the scans above to cover its files, or drop it from them',
		).toEqual(['boundary', 'geometry', 'pure', 'unit', 'workspace'])

		// The browser config is the fourth scan above, and it is a separate file
		// the parse over vitest.config.ts cannot reach. Its instances share one
		// page each, which is why that scan exists at all.
		const browser = readFileSync(join(srcDir, '..', 'vitest.browser.config.ts'), 'utf8')

		expect(
			/^\s*isolate: false/m.test(browser),
			'vitest.browser.config.ts no longer shares a page — drop the browser scan above, which exists for that setting',
		).toBe(true)
	})

	it('sets a browser viewport only in a beforeAll', () => {
		const loose = collectPatternViolations({
			dir: join(testsDir, 'browser'),
			patterns: [LOOSE_VIEWPORT],
			stripComments: true,
		})

		expect(
			loose,
			`a browser file states its width once, as \`beforeAll(() => page.viewport(w, h))\` — a call inside an \`it\` reaches the file's later cases, and nothing restores it there:\n  ${loose.join('\n  ')}`,
		).toEqual([])
	})

	it('states the viewport for every top-level block of a file that sets one', () => {
		const gaps: string[] = []

		walkSource(
			join(testsDir, 'browser'),
			(file, content) => {
				if (!isSourceFile(file)) return

				for (const block of unstatedViewports(stripSourceComments(content))) {
					gaps.push(`${srcRelative(file)} → ${block}`)
				}
			},
			new Set(['setup']),
		)

		gaps.push(
			...collectPatternViolations({
				dir: join(testsDir, 'browser'),
				patterns: [NESTED_VIEWPORT],
				skip: new Set(['setup']),
				stripComments: true,
			}),
		)

		expect(
			gaps,
			`a block with no viewport hook runs at the width a block above it left, or a nested hook left — state it at file level, or at the head of each top-level block:\n  ${gaps.join('\n  ')}`,
		).toEqual([])
	})

	it('casts no nullable query to a non-null element', () => {
		const casts = collectPatternViolations({
			dir: testsDir,
			patterns: [NULLABLE_CAST],
			stripComments: true,
		})

		expect(
			casts,
			`a cast cannot make a query non-null — take \`getSlot(container, name)\` for a slot, or \`present(query, 'what')\` for anything else:\n  ${casts.join('\n  ')}`,
		).toEqual([])
	})

	it('stops a case at its signal before it writes shared state after an await', () => {
		const tests: string[] = []

		const modules: string[] = []

		for (const dir of [testsDir, docsTestDir]) {
			walkSource(dir, (file, content) => {
				// A write can come late only after an `await`, so a test file with none
				// needs no parse. Most of the test files have none. The other modules
				// of the trees are the helpers that a test file can import.
				if (!/\.test\.tsx?$/.test(file)) {
					if (isSourceFile(file)) modules.push(file)
				} else if (content.includes('await')) {
					tests.push(file)
				}
			})
		}

		const parse = parser(server, [...tests, ...modules])

		const late = tests.flatMap((file) => unguardedLateWrites(file, parse))

		expect(
			late,
			`a case that runs longer than its time limit continues at its next \`await\` while a later case runs — take \`{ signal }\` from the test context, and call \`signal.throwIfAborted()\` after the last \`await\` and before the write (CONVENTIONS.md §10.9):\n  ${late.join('\n  ')}`,
		).toEqual([])
	})

	/** The late writes of a fixture `source`, by label. */
	const lateIn = (source: string) => {
		const file = server.write('fixture.test.ts', source)

		return unguardedLateWrites(file, parser(server, [file])).map((late) =>
			late.slice(late.indexOf('→ ') + 2),
		)
	}

	/** A case that runs `line` after an `await`, under the imports of `head`. */
	const afterAwait = (line: string, head = '') =>
		`${head}\nit('a', async () => {\n\tawait tick()\n\n\t${line}\n})\n`

	/** The labels of the module-registry rules that `text` breaks. */
	const forbiddenIn = (text: string) =>
		FORBIDDEN_PATTERNS.flatMap(({ label, regex }) => [...text.matchAll(regex)].map(() => label))

	it('reads a module mock or a registry reset in each spelling', () => {
		// The scan above reads this file too, so no fixture spells a call whole.
		const vi = 'vi'

		expect(forbiddenIn(`${vi}.mock('x')`)).toEqual(['per-file module mock'])

		expect(forbiddenIn(`${vi}.mock<typeof import('x')>('x')`)).toEqual(['per-file module mock'])

		expect(forbiddenIn(`${vi}.doMock ('x')`)).toEqual(['per-file module mock'])

		expect(forbiddenIn(`vitest\n\t.unmock(\n\t\t'x',\n\t)`)).toEqual(['per-file module mock'])

		expect(forbiddenIn(`${vi}.resetModules ()`)).toEqual(['module registry reset'])

		expect(forbiddenIn(`${vi}.mocked(fn)`)).toEqual([])

		expect(forbiddenIn(`${vi}.mockObject(api)`)).toEqual([])

		expect(forbiddenIn(`na${vi}.mock('x')`)).toEqual([])
	})

	it('reads a viewport hook in a nested block', () => {
		const nested = [
			`import { page } from 'vitest/browser'`,
			`describe('a', () => {`,
			`\tbeforeAll(() => page.viewport(1280, 800))`,
			`\tdescribe('wide', () => {`,
			`\t\tbeforeAll(() => page.viewport(1600, 800))`,
			`\t})`,
			`\tdescribe('narrow', () => {})`,
			`})`,
		].join('\n')

		expect([...nested.matchAll(NESTED_VIEWPORT.regex)].map(([line]) => line.trim())).toEqual([
			'beforeAll(() => page.viewport(1600, 800))',
		])

		// The top-level hook is in order, so the block rule alone does not see it.
		expect(unstatedViewports(nested)).toEqual([])

		const flat = nested.replace(/^\t\tbeforeAll.*\n/m, '')

		expect([...flat.matchAll(NESTED_VIEWPORT.regex)]).toEqual([])
	})

	it('reads a late call that writes a global object', () => {
		expect(lateIn(afterAwait(`localStorage.setItem('k', 'v')`))).toEqual(['localStorage.setItem()'])

		expect(lateIn(afterAwait(`window.sessionStorage.clear()`))).toEqual([
			'window.sessionStorage.clear()',
		])

		expect(lateIn(afterAwait(`history.pushState({}, '', '/x')`))).toEqual(['history.pushState()'])

		expect(lateIn(afterAwait(`document.documentElement.setAttribute('dir', 'rtl')`))).toEqual([
			'document.documentElement.setAttribute()',
		])

		expect(lateIn(afterAwait(`document.body.classList.add('x')`))).toEqual([
			'document.body.classList.add()',
		])

		expect(lateIn(afterAwait(`Object.assign(window, { a: 1 })`))).toEqual(['Object.assign(window)'])

		// A write before the first `await`, or after the guard, is in order.
		expect(
			lateIn(`it('a', async () => {\n\tlocalStorage.setItem('k', 'v')\n\tawait tick()\n})\n`),
		).toEqual([])

		expect(
			lateIn(
				afterAwait(`signal.throwIfAborted()\n\tlocalStorage.setItem('k', 'v')`).replace(
					'async ()',
					'async ({ signal })',
				),
			),
		).toEqual([])

		// A local object, or a read, is not shared state.
		expect(lateIn(afterAwait(`const store = new Map()\n\tstore.clear()`))).toEqual([])

		expect(
			lateIn(afterAwait(`const localStorage = memory()\n\tlocalStorage.setItem('k', 'v')`)),
		).toEqual([])

		expect(lateIn(afterAwait(`localStorage.getItem('k')`))).toEqual([])

		expect(lateIn(afterAwait(`element.setAttribute('dir', 'rtl')`, 'let element'))).toEqual([])

		expect(lateIn(afterAwait(`Object.assign({}, window)`))).toEqual([])
	})

	it('reads a late spy on a const that holds a prototype or a global', () => {
		expect(lateIn(afterAwait(`const p = HTMLElement.prototype\n\tvi.spyOn(p, 'focus')`))).toEqual([
			'vi.spyOn(p)',
		])

		expect(
			lateIn(
				afterAwait(
					`vi.spyOn(proto, 'focus')`,
					'const base = HTMLElement\nconst proto = base.prototype',
				),
			),
		).toEqual(['vi.spyOn(proto)'])

		expect(lateIn(afterAwait(`const w = window\n\tvi.spyOn(w, 'open')`))).toEqual(['vi.spyOn(w)'])

		expect(
			lateIn(
				afterAwait(`const element = document.createElement('a')\n\tvi.spyOn(element, 'focus')`),
			),
		).toEqual([])

		expect(lateIn(afterAwait(`let p = HTMLElement.prototype\n\tvi.spyOn(p, 'focus')`))).toEqual([])
	})

	it('reads a late change to the implementation of an imported mock', () => {
		const head = `import { useReducedMotion } from 'motion/react'`

		expect(
			lateIn(afterAwait(`vi.mocked(useReducedMotion).mockImplementation(() => true)`, head)),
		).toEqual(['vi.mocked(useReducedMotion).mockImplementation()'])

		expect(
			lateIn(afterAwait(`vi.mocked(useReducedMotion).mockReturnValueOnce(true)`, head)),
		).toEqual(['vi.mocked(useReducedMotion).mockReturnValueOnce()'])

		expect(
			lateIn(
				afterAwait(
					`motion.useReducedMotion.mockReturnValue(true)`,
					`import * as motion from 'motion/react'`,
				),
			),
		).toEqual(['motion.useReducedMotion.mockReturnValue()'])

		// A mock that the file or the case declares does not outlive the file.
		expect(
			lateIn(afterAwait(`const local = vi.fn()\n\tlocal.mockImplementation(() => 1)`)),
		).toEqual([])

		expect(lateIn(afterAwait(`fileMock.mockReturnValue(1)`, 'const fileMock = vi.fn()'))).toEqual(
			[],
		)

		// A read of an imported mock is not a write.
		expect(lateIn(afterAwait(`vi.mocked(useReducedMotion).mock.calls`, head))).toEqual([])
	})
})
