import { transformSync } from '@babel/core'
import reactCompiler, { type LoggerEvent, OPT_OUT_DIRECTIVES } from 'babel-plugin-react-compiler'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// The React Compiler skip ledger. The compiler skips a function that it cannot
// compile, or that breaks one of its rules. A skipped function runs as plain
// React, so a skip is safe, but it loses its memoization, and nothing reports
// it. A ref read during render, a `??=`, or a computed key can each cause one.
//
// This suite compiles the source that an app imports, and lists each function
// that the compiler skips. The list is a file snapshot, react-compiler-skips.json.
// A new skip fails the run, and so does a fixed skip that the ledger still
// names. Each fix thus removes an entry. A skip joins the ledger only in the
// commit that adds it, where the diff shows it.
//
// The pass compiles about 800 modules in about 20 seconds, so it runs only in
// the compiled run (vitest.compiler.config.ts), in a project of its own.

/** The ledger: each file with skips, and in it each skipped function with its cause. */
type Ledger = Record<string, Record<string, string>>

/** The docs site. An app does not import it. `walkSource` leaves out the tests and the build output. */
const SKIP = new Set(['docs'])

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

/**
 * The functions of one module that the compiler skips, by name, with the
 * cause. A module that opens with `'use no memo'` is one entry, `(module)`.
 * The grid's engine boundary is such a module (CONVENTIONS.md §10.7).
 */
function moduleSkips(file: string, source: string): Record<string, string> {
	const lines = source.split('\n')

	const skips: Record<string, string> = {}

	const logEvent = (_: string | null, event: LoggerEvent) => {
		if (
			event.kind !== 'CompileError' &&
			event.kind !== 'CompileSkip' &&
			event.kind !== 'PipelineError'
		) {
			return
		}

		const line = event.fnLoc?.start.line ?? 0

		const name = DECLARED_NAME.exec(lines[line - 1] ?? '')?.[1] ?? `(line ${line})`

		// A function reports one event for each diagnostic. The first one names it.
		skips[name] ??= causeOf(event)
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

	// The compiler still reports on a module that opts out, but it keeps none of
	// the output.
	const optOut = result?.ast?.program.directives.find((directive) =>
		OPT_OUT_DIRECTIVES.has(directive.value.value),
	)

	return optOut ? { '(module)': optOut.value.value } : skips
}

/** The ledger that the source gives now, with its files in path order. */
function currentLedger(): Ledger {
	const ledger: Ledger = {}

	walkSource(
		srcDir,
		(file, source) => {
			if (!SOURCE.test(file)) return

			if (!file.endsWith('.tsx') && !HOOK_CALL.test(source)) return

			const skips = moduleSkips(file, source)

			if (Object.keys(skips).length > 0) ledger[srcRelative(file)] = skips
		},
		SKIP,
	)

	return Object.fromEntries(Object.entries(ledger).sort(([a], [b]) => (a < b ? -1 : 1)))
}

describe('React Compiler skip ledger', () => {
	it('lists each function that the compiler skips', async () => {
		await expect(`${JSON.stringify(currentLedger(), null, '\t')}\n`).toMatchFileSnapshot(
			'./react-compiler-skips.json',
			'Fix a new skip if you can. Then write the ledger with -u, and commit it',
		)
	})
})
