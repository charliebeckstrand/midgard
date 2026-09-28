import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import ts from '@typescript/typescript6'
import { describe, expect, it } from 'vitest'

import {
	collectPatternViolations,
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
// helper reaches the same registry — the docs engine suite it also runs, the
// `boundary` project's own files, and the browser suite, whose two instances
// share one page each (`isolate: false` in vitest.browser.config.ts). Its
// per-instance doubles live in a `setup/` directory at either depth, which
// `skip` prunes by entry name.
const SHARED_REGISTRY_SCANS = [
	{ dir: testsDir, skip: SHARED_REGISTRY_SKIP },
	{ dir: join(srcDir, 'docs', 'engine', '__tests__') },
	// The `boundary` and `workspace` projects: each `-boundary` suite.
	{ dir: join(testsDir, 'boundary'), fileFilter: /-boundary\.test\.ts$/ },
	{ dir: join(testsDir, 'browser'), skip: new Set(['setup']) },
]

// `vitest` is a global alias for `vi` under `globals: true`, so both spellings
// reach the same registry.
const FORBIDDEN_PATTERNS = [
	{ label: 'per-file module mock', regex: /\b(?:vi|vitest)\.(?:mock|doMock|unmock|doUnmock)\(/g },
	{ label: 'module registry reset', regex: /\b(?:vi|vitest)\.resetModules\(/g },
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
// a global or a prototype, and a module-scope `let`. A helper in the same file
// that makes such a write counts as one. A write to the DOM is out of scope:
// `cleanup`, the residue guard, and the page reset of the browser suite undo
// it. The scan reads source order, so a write that a loop repeats after an
// `await` lower in the loop body escapes it.

/** The `vi` calls that change state that outlives a case. */
const SHARED_STATE_CALL =
	/^(?:vi|vitest)\.(?:doMock|doUnmock|stubGlobal|stubEnv|resetModules|useFakeTimers|useRealTimers|setSystemTime|restoreAllMocks|resetAllMocks|unstubAllGlobals|unstubAllEnvs)$/

/** A target that every case shares: a global, or a prototype. */
const SHARED_TARGET = /^(?:globalThis|window|document|navigator|[\w.]+\.prototype)\b/

/** The calls that take the body of a case or of a hook. */
const CASE_OR_HOOK = new Set(['it', 'test', 'beforeEach', 'afterEach', 'beforeAll', 'afterAll'])

/** The identifier at the root of a callee: `it` for `it.each(rows)`. */
function calleeRoot(node: ts.Expression): string | undefined {
	if (ts.isIdentifier(node)) return node.text

	if (ts.isPropertyAccessExpression(node) || ts.isCallExpression(node)) {
		return calleeRoot(node.expression)
	}

	return undefined
}

/** The root of an assignment target: `globalThis` for `globalThis.fetch`. */
function targetRoot(node: ts.Expression): ts.Expression {
	return ts.isPropertyAccessExpression(node) || ts.isElementAccessExpression(node)
		? targetRoot(node.expression)
		: node
}

/**
 * The late writes of one file: each write to shared state in a case or a hook
 * that comes after an `await`, with no `throwIfAborted()` between the latest
 * `await` and the write.
 */
function unguardedLateWrites(file: string, text: string): string[] {
	const source = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true)

	const moduleLets = new Set<string>()

	const functions = new Map<string, ts.Node>()

	for (const statement of source.statements) {
		if (ts.isFunctionDeclaration(statement) && statement.name && statement.body) {
			functions.set(statement.name.text, statement.body)
		}

		if (!ts.isVariableStatement(statement)) continue

		const isLet = (statement.declarationList.flags & ts.NodeFlags.Let) !== 0

		for (const declaration of statement.declarationList.declarations) {
			if (!ts.isIdentifier(declaration.name)) continue

			if (isLet) moduleLets.add(declaration.name.text)

			const init = declaration.initializer

			if (init && (ts.isArrowFunction(init) || ts.isFunctionExpression(init))) {
				functions.set(declaration.name.text, init.body)
			}
		}
	}

	const writers = new Set<string>()

	/** The label of a write to shared state, or `undefined` for any other node. */
	function writeLabel(node: ts.Node): string | undefined {
		if (ts.isCallExpression(node)) {
			const callee = node.expression.getText(source)

			if (SHARED_STATE_CALL.test(callee)) return callee

			const [target] = node.arguments

			if (
				/^(?:vi|vitest)\.spyOn$/.test(callee) &&
				target &&
				SHARED_TARGET.test(target.getText(source))
			) {
				return `${callee}(${target.getText(source)})`
			}

			if (ts.isIdentifier(node.expression) && writers.has(callee)) return `${callee}()`
		}

		if (
			ts.isBinaryExpression(node) &&
			node.operatorToken.kind >= ts.SyntaxKind.FirstAssignment &&
			node.operatorToken.kind <= ts.SyntaxKind.LastAssignment
		) {
			const root = targetRoot(node.left)

			if (ts.isIdentifier(root) && moduleLets.has(root.text) && root === node.left) {
				return `${root.text} =`
			}

			if (root !== node.left && SHARED_TARGET.test(root.getText(source))) {
				return `${node.left.getText(source)} =`
			}
		}

		return undefined
	}

	function containsWrite(node: ts.Node): boolean {
		return writeLabel(node) !== undefined || (ts.forEachChild(node, containsWrite) ?? false)
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

	const late: string[] = []

	function scanBody(body: ts.Node) {
		const awaits: number[] = []

		const guards: number[] = []

		const writes: { at: number; label: string }[] = []

		const visit = (node: ts.Node) => {
			ts.forEachChild(node, visit)

			if (ts.isAwaitExpression(node)) awaits.push(node.getEnd())

			if (ts.isCallExpression(node) && /\.throwIfAborted$/.test(node.expression.getText(source))) {
				guards.push(node.getStart(source))
			}

			const label = writeLabel(node)

			if (label) writes.push({ at: node.getStart(source), label })
		}

		visit(body)

		for (const { at, label } of writes) {
			// An `await` that holds the write ends after it, so it does not count.
			const resumed = Math.max(-1, ...awaits.filter((end) => end <= at))

			if (resumed < 0 || guards.some((guard) => guard >= resumed && guard < at)) continue

			const line = source.getLineAndCharacterOfPosition(at).line + 1

			late.push(`${srcRelative(file)}:${line} → ${label}`)
		}
	}

	function visit(node: ts.Node) {
		if (ts.isCallExpression(node) && CASE_OR_HOOK.has(calleeRoot(node.expression) ?? '')) {
			const body = node.arguments.findLast(
				(arg) => ts.isArrowFunction(arg) || ts.isFunctionExpression(arg),
			)

			if (body) {
				scanBody(body)

				return
			}
		}

		ts.forEachChild(node, visit)
	}

	visit(source)

	return late
}

describe('test isolation boundary', () => {
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
	// text rather than import it: it pulls in the docs plugin, and with it
	// ts-morph, which this node project exists to avoid.
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
		).toEqual(['boundary', 'pure', 'unit', 'workspace'])

		// The browser config is the fourth scan above, and it is a separate file
		// the parse over vitest.config.ts cannot reach. Its two instances share one
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

		expect(
			gaps,
			`a block with no viewport hook runs at the width a block above it left — state it at file level, or at the head of each top-level block:\n  ${gaps.join('\n  ')}`,
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
		const late: string[] = []

		for (const dir of [testsDir, join(srcDir, 'docs', 'engine', '__tests__')]) {
			walkSource(dir, (file, content) => {
				if (/\.test\.tsx?$/.test(file)) late.push(...unguardedLateWrites(file, content))
			})
		}

		expect(
			late,
			`a case that runs longer than its time limit continues at its next \`await\` while a later case runs — take \`{ signal }\` from the test context, and call \`signal.throwIfAborted()\` after the last \`await\` and before the write (CONVENTIONS.md §10.9):\n  ${late.join('\n  ')}`,
		).toEqual([])
	})
})
