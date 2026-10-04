import { transformSync, traverse, types } from '@babel/core'
import reactCompiler, { type LoggerEvent, OPT_OUT_DIRECTIVES } from 'babel-plugin-react-compiler'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// The React Compiler skip gate. The compiler skips a function that it cannot
// compile, or that breaks one of its rules. A skipped function runs as plain
// React, so a skip is safe, but it loses its memoization, and nothing reports
// it. A ref read during render, a `??=`, or a computed key can each cause one.
//
// This suite compiles the source that an app imports, and fails on each
// function that the compiler skips. A function that opts out with `'use no memo'`
// is not a skip: the compiler keeps none of its output, and the opt-out boundary
// test (`boundary/compiler-opt-out-boundary.test.ts`) lists it with its reason.
// Fix a new skip. If you cannot, opt the function out, and add it to that list.
//
// The pass compiles about 800 modules in about 20 seconds, so it runs only in
// the compiled run (vitest.compiler.config.ts), in a project of its own.

/** Each file with skips, and in it each skipped function with its cause. */
type Skips = Record<string, Record<string, string>>

/** The docs sites. An app does not import them. `walkSource` leaves out the tests and the build output. */
const SKIP = new Set(['docs', 'docs-legacy'])

/** A TypeScript source file, not a declaration file. */
const SOURCE = /(?<!\.d)\.tsx?$/

/**
 * The compiler compiles a function only if it calls a hook or makes JSX. A
 * `.ts` file cannot make JSX, so the suite compiles it only if it calls a
 * hook. It compiles each `.tsx` file.
 */
const HOOK_CALL = /\buse(?:[A-Z]\w*)?\s*[(<]/

/** The name that a function's first line declares, as `function name` or `const name =`. */
const DECLARED_NAME = /(?:function\*?\s+|(?:const|let|var)\s+)([A-Za-z_$][\w$]*)/

/**
 * The cause of a skip. For an error, this is the compiler's category, such as
 * `Refs` or `Todo`. The message is not used, because some messages hold an
 * internal id that changes when other code in the file changes.
 */
function causeOf(event: LoggerEvent): string {
	if (event.kind === 'CompileError') return event.detail.category

	if (event.kind === 'CompileSkip') return event.reason

	return event.kind
}

/** Whether a directive is `'use no memo'` or another opt-out of the compiler. */
function isOptOut(directive: types.Directive): boolean {
	return OPT_OUT_DIRECTIVES.has(directive.value.value)
}

/** The start of a function, as `line:column`. A compiler event names its function by the same key. */
function startKey(loc: types.SourceLocation | null | undefined): string {
	return `${loc?.start.line ?? 0}:${loc?.start.column ?? 0}`
}

/** The start of each function in a module that opts out with a directive of its body. */
function optedOutFunctions(ast: types.File): Set<string> {
	const starts = new Set<string>()

	traverse(ast, {
		Function(path) {
			const { body } = path.node

			if (types.isBlockStatement(body) && body.directives.some(isOptOut)) {
				starts.add(startKey(path.node.loc))
			}
		},
	})

	return starts
}

/**
 * The functions of one module that the compiler skips, by name, with the
 * cause. A module or a function that opts out is not in the result.
 */
function moduleSkips(file: string, source: string): Record<string, string> {
	const lines = source.split('\n')

	const events: { fnLoc: types.SourceLocation | null | undefined; cause: string }[] = []

	const logEvent = (_: string | null, event: LoggerEvent) => {
		if (
			event.kind === 'CompileError' ||
			event.kind === 'CompileSkip' ||
			event.kind === 'PipelineError'
		) {
			events.push({ fnLoc: event.fnLoc, cause: causeOf(event) })
		}
	}

	const result = transformSync(source, {
		filename: file,
		babelrc: false,
		configFile: false,
		ast: true,
		code: false,
		parserOpts: { plugins: file.endsWith('.tsx') ? ['typescript', 'jsx'] : ['typescript'] },
		plugins: [[reactCompiler, { logger: { logEvent }, panicThreshold: 'none' }]],
	})

	const ast = result?.ast

	if (!ast) return {}

	// The compiler still reports on a module or a function that opts out, but it
	// keeps none of the output.
	if (ast.program.directives.some(isOptOut)) return {}

	const optedOut = optedOutFunctions(ast)

	const skips: Record<string, string> = {}

	for (const { fnLoc, cause } of events) {
		if (optedOut.has(startKey(fnLoc))) continue

		const line = fnLoc?.start.line ?? 0

		const name = DECLARED_NAME.exec(lines[line - 1] ?? '')?.[1] ?? `(line ${line})`

		// A function reports one event for each diagnostic. The first one names it.
		skips[name] ??= cause
	}

	return skips
}

/** The skips that the source gives now, with their files in path order. */
function currentSkips(): Skips {
	const skips: Skips = {}

	walkSource(
		srcDir,
		(file, source) => {
			if (!SOURCE.test(file)) return

			if (!file.endsWith('.tsx') && !HOOK_CALL.test(source)) return

			const found = moduleSkips(file, source)

			if (Object.keys(found).length > 0) skips[srcRelative(file)] = found
		},
		SKIP,
	)

	return Object.fromEntries(Object.entries(skips).sort(([a], [b]) => (a < b ? -1 : 1)))
}

describe('React Compiler skips', () => {
	it('the compiler compiles each function that does not opt out', () => {
		expect(
			currentSkips(),
			'Fix the skip. If you cannot, add a function-level `use no memo` with its reason, and list it in the opt-out boundary test',
		).toEqual({})
	})
})
