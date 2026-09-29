import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { getLibFiles } from '@ts-morph/common'
import type { ComponentType } from 'react'
import { ts } from 'ts-morph'
import { describe, expect, it } from 'vitest'
import { AppearanceProvider } from '../../providers/appearance'
import { type DemoPage, demoPages, restoreRootAfterCase, visitTabs } from './demo-pages'

// A gate on the text of each "Show code" block of the docs site. Two test files
// in `docs/` run it, and each file gives it a part of the pages, so that the
// test shards in CI can balance the pages.
//
// A reader copies the block, so a block that does not compile teaches a bug.
// The block derives at run time from the rendered tree of an Example and from
// the source that the `docs:pre` transform attaches at build time.
// `demo-code-block.test.ts` asks whether a block exists. This gate reads the
// block itself.
//
// It renders each demo page, opens each tab, and opens each "Show code". It
// then checks each block as one TSX module, on its own, with the DOM lib and
// no import resolution. A block fails on a syntax error, on a name that it
// declares twice, or on a name that it uses and neither declares nor imports.
// A derived block with none of those also fails on an import or a top-level
// declaration that it never uses: a name that the walk pulled by mistake. The
// gate does not type-check the block against ui, so a wrong prop passes.
//
// A block reads as imports, then declarations, then the JSX of the Example as
// sibling elements. `asModule` wraps that JSX in a component, so the siblings
// parse. A derived block always has an import, because `deriveCode` returns
// null without one. A hand-written `code` override has none. It is a fragment,
// and it names state that it does not declare (`value`, `onValueChange`) on
// purpose, so it gets the syntax check alone. An override that elides (`…`, or
// `...` that is not a spread) or holds no JSX is pseudo-code, and the gate
// skips it.
//
// `KNOWN_FAILURES` lists the blocks that fail today. Each page must match its
// entries: a new failure fails the gate, and so does an entry whose block now
// compiles. A case for each page keeps each case inside the time limit.

/**
 * The blocks that fail the gate today, keyed `page › example`, with the first
 * diagnostic of each. Fix a block, and remove its entry.
 */
const KNOWN_FAILURES: Record<string, string> = {
	// A `useState` value that the block declares and never reads, because the
	// block prints the value's use from the live render: a text child as its live
	// text, or a condition that renders nothing yet.
	'components/hold-button › Default': "TS6133: 'count' is declared but its value is never read.",
	'components/hold-button › Lifecycle callbacks':
		"TS6133: 'status' is declared but its value is never read.",
	'components/signature-pad › Imperative handle':
		"TS6133: 'value' is declared but its value is never read.",

	// A hand-written override that does not parse.
	'modules/chart › Basic': 'TS17014: JSX fragment has no corresponding closing tag.',
}

// The semantic diagnostics that the gate keeps: a name declared twice, or a
// name used and never declared. The others are out of scope. The checker
// resolves no import and has no types for React or ui, so it reports an
// unresolved module, untyped JSX, and a wrong prop for every block.
const NAME_DIAGNOSTICS = new Set([
	2300, // Duplicate identifier.
	2304, // Cannot find name.
	2393, // Duplicate function implementation.
	2440, // Import declaration conflicts with local declaration.
	2451, // Cannot redeclare block-scoped variable.
	2503, // Cannot find namespace.
	2552, // Cannot find name. Did you mean …?
])

// The diagnostics of a name that the block declares or imports and never
// uses, with `noUnusedLocals` on.
const UNUSED_DIAGNOSTICS = new Set([
	6133, // 'x' is declared but its value is never read.
	6192, // All imports in import declaration are unused.
	6196, // 'x' is declared but never used.
	6198, // All destructured elements are unused.
])

const LIB_DIR = '/lib'

const libFiles = new Map(
	getLibFiles().map(({ fileName, text }) => [`${LIB_DIR}/${fileName}`, text]),
)

const libSourceFiles = new Map<string, ts.SourceFile>()

const SNIPPET = '/snippet.tsx'

/** The component that `asModule` wraps the JSX of a block in. */
const SNIPPET_COMPONENT = '__Snippet'

/** An elision in a hand-written override: `…`, or `...` that is not a spread. */
const ELISION = /…|\.\.\.(?![\w$[{(])/

/** Whether a block is a hand-written override that is not meant to compile. */
function isPseudoCode(snippet: string): boolean {
	return !/^import /m.test(snippet) && (ELISION.test(snippet) || !/<[A-Za-z]/.test(snippet))
}

/**
 * `code` as a TSX module. The walker's `{...}`, a value it cannot print, reads
 * as `undefined`. The JSX from its first element at column 0 is wrapped in a
 * component, and an override that is an object literal in parentheses.
 */
function asModule(code: string): string {
	if (code.startsWith('{')) return `;(${code})`

	const lines = code.replaceAll('{...}', '{undefined}').split('\n')

	const start = lines.findIndex((line) => line.startsWith('<'))

	if (start === -1) return lines.join('\n')

	return [
		...lines.slice(0, start),
		`export function ${SNIPPET_COMPONENT}() {`,
		'return (<>',
		...lines.slice(start),
		'</>)',
		'}',
	].join('\n')
}

/**
 * The diagnostics of a block, as `TS2304: …` lines: syntax, and for a derived
 * block the names that it declares twice or does not declare.
 */
function diagnose(snippet: string): string[] {
	const code = asModule(snippet)

	const derived = /^import /m.test(snippet)

	const host: ts.CompilerHost = {
		fileExists: (file) => file === SNIPPET || libFiles.has(file),
		readFile: (file) => (file === SNIPPET ? code : libFiles.get(file)),
		writeFile: () => {},
		getSourceFile: (file, target) => {
			if (file === SNIPPET) {
				return ts.createSourceFile(file, code, target, true, ts.ScriptKind.TSX)
			}

			let cached = libSourceFiles.get(file)

			const text = libFiles.get(file)

			if (!cached && text !== undefined) {
				cached = ts.createSourceFile(file, text, target, true)

				libSourceFiles.set(file, cached)
			}

			return cached
		},
		getDefaultLibFileName: () => `${LIB_DIR}/lib.d.ts`,
		getCurrentDirectory: () => '/',
		getCanonicalFileName: (file) => file,
		useCaseSensitiveFileNames: () => true,
		getNewLine: () => '\n',
	}

	const program = ts.createProgram({
		rootNames: [SNIPPET],
		options: {
			target: ts.ScriptTarget.ES2022,
			module: ts.ModuleKind.ESNext,
			jsx: ts.JsxEmit.Preserve,
			lib: ['lib.es2023.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
			noResolve: true,
			noUnusedLocals: true,
			skipLibCheck: true,
			types: [],
		},
		host,
	})

	const sf = program.getSourceFile(SNIPPET)

	const syntactic = program.getSyntacticDiagnostics(sf)

	const semantic = syntactic.length > 0 || !derived ? [] : program.getSemanticDiagnostics(sf)

	const names = semantic.filter((d) => NAME_DIAGNOSTICS.has(d.code))

	const diagnostics =
		syntactic.length > 0 || !derived
			? syntactic
			: names.length > 0
				? names
				: unusedOf(semantic, sf, code.includes(SNIPPET_COMPONENT))

	return diagnostics.map((d) => `TS${d.code}: ${messageOf(d)}`)
}

function messageOf(diagnostic: ts.Diagnostic): string {
	return ts.flattenDiagnosticMessageText(diagnostic.messageText, ' ')
}

/** The deepest node of `sf` that holds `position`. */
function nodeAt(sf: ts.SourceFile, position: number): ts.Node {
	let found: ts.Node = sf

	const visit = (node: ts.Node) => {
		if (node.getStart(sf) > position || position >= node.getEnd()) return

		found = node

		ts.forEachChild(node, visit)
	}

	ts.forEachChild(sf, visit)

	return found
}

/**
 * Whether a node names what the block itself declares: an import, or a name
 * that a top-level statement declares. A parameter, a type parameter, and a
 * local of a helper are authored code, so they do not count.
 */
function isBlockName(node: ts.Node): boolean {
	// The walk starts at the node itself: an unused import line reports on the
	// declaration, not on a name inside it.
	for (let current: ts.Node | undefined = node; current; current = current.parent) {
		if (ts.isImportDeclaration(current)) return true

		if (ts.isParameter(current) || ts.isTypeParameterDeclaration(current)) return false

		if (ts.isBlock(current)) return false

		if (current.parent !== undefined && ts.isSourceFile(current.parent)) return true
	}

	return false
}

/**
 * The unused-name diagnostics of the block's own imports and top-level
 * declarations. A block with no JSX shows one helper on its own. It declares
 * that helper and never uses it, so the last unused PascalCase name is exempt
 * there.
 */
function unusedOf(
	diagnostics: readonly ts.Diagnostic[],
	sf: ts.SourceFile | undefined,
	hasJsx: boolean,
): ts.Diagnostic[] {
	if (!sf) return []

	const unused = diagnostics.filter(
		(d) =>
			UNUSED_DIAGNOSTICS.has(d.code) && d.start !== undefined && isBlockName(nodeAt(sf, d.start)),
	)

	if (hasJsx) return unused

	const shown = unused.findLast((d) => /^'[A-Z]/.test(messageOf(d)))

	return unused.filter((d) => d !== shown)
}

/** The title of an Example frame, or `null` for an untitled one. */
function titleOf(frame: Element): string | null {
	const head = frame.firstElementChild

	if (!head || head.getAttribute('data-slot') === 'example-frame') return null

	return head.querySelector('h3')?.textContent ?? null
}

/**
 * Each "Show code" block of a demo page, keyed by example title (or position),
 * with a suffix for a repeated title. It reads the blocks in each state that
 * the page's tabs show.
 */
async function snippetsOf(Demo: ComponentType): Promise<Map<string, string>> {
	const { container } = render(
		<AppearanceProvider>
			<Demo />
		</AppearanceProvider>,
	)

	const snippets = new Map<string, string>()

	const seenFrames = new WeakSet<Element>()

	const harvest = async () => {
		const frames = [...container.querySelectorAll('[data-slot="example"]')]

		for (const [index, frame] of frames.entries()) {
			if (seenFrames.has(frame)) continue

			seenFrames.add(frame)

			const trigger = within(frame as HTMLElement).queryAllByRole('button', {
				name: 'Show code',
			})[0]

			if (!trigger) continue

			await act(async () => {
				fireEvent.click(trigger)
			})

			const code = frame.querySelector('[data-slot="code-block"] code')?.textContent

			if (!code) continue

			const base = titleOf(frame) ?? `#${index + 1}`

			let key = base

			for (let n = 2; snippets.has(key) && snippets.get(key) !== code; n += 1)
				key = `${base} (${n})`

			snippets.set(key, code)
		}
	}

	await visitTabs(container, harvest)

	cleanup()

	return snippets
}

/** The entries of `KNOWN_FAILURES` for one page. */
function knownFailuresOf(page: string): Record<string, string> {
	return Object.fromEntries(
		Object.entries(KNOWN_FAILURES).filter(([key]) => key.startsWith(`${page} › `)),
	)
}

/**
 * Registers a snippet case for each page of `pages`, and the check of the page
 * names in `KNOWN_FAILURES` against all the pages.
 */
export function describeDemoSnippets(pages: readonly DemoPage[]): void {
	describe('demo snippets', () => {
		it.each(pages)(
			'%s derives blocks that compile',
			// The grid page opens about 45 blocks across its tabs, in about 7s.
			{ timeout: 30_000 },
			async (page, load) => {
				restoreRootAfterCase()

				const Demo = await load()

				const snippets = await snippetsOf(Demo)

				// Each page shows at least one block, so an empty harvest is a broken gate.
				expect(snippets.size, 'no "Show code" block was read').toBeGreaterThan(0)

				const failures: Record<string, string> = {}

				for (const [title, code] of snippets) {
					if (isPseudoCode(code)) continue

					const [first] = diagnose(code)

					if (first) failures[`${page} › ${title}`] = first
				}

				expect(failures).toEqual(knownFailuresOf(page))
			},
		)

		it('names only pages that exist in its known failures', () => {
			const names = new Set(demoPages.map(([page]) => page))

			const unknown = Object.keys(KNOWN_FAILURES).filter(
				(key) => !names.has(key.split(' › ')[0] ?? ''),
			)

			expect(unknown).toEqual([])
		})
	})
}
