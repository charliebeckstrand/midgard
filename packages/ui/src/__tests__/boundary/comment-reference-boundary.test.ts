import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative } from '../helpers/walk-source'

// A comment that names a file or a symbol states a fact about the tree, and
// the tree moves. CONVENTIONS.md §12.4 already bans one spelling of the defect
// — an audit named from code — because the reference dangles when the audit
// goes. These two cases hold the same rule for the two references a scan can
// check: the name of a test or benchmark file, and a `{@link}` target.
//
// The 2026-09-12 documentation audit closed thirteen rows across both
// categories and added no gate, and both rotted inside a month. Steps 7 and 9
// of the 2026-09-11 test architecture audit moved four boundary rules into
// `biome.json` and `biome-plugins/`, and deleted the tests that had held them.
// Nine comments still named those four files. The contracts survived the move;
// only the pin changed, and no run said so.
//
// Both cases test membership against a set, not resolution in a scope. The
// distinction decides the link case, so it is written down here:
//
//   A `{@link}` target is almost never imported at the site that names it —
//   `core/aria-attr.ts` links `dataAttr`, which lives in its sibling. So a
//   checker resolves the target against the file's own scope and answers
//   "absent" for a symbol that is present in the package. Measured against a
//   program over every barrel, that reads 1,255 of 3,759 sites as unresolved.
//   Such a program is also blind to every file no barrel reaches, and
//   `__benchmarks__/fixtures.ts` carried one of the five defects the audit
//   found by hand.
//
// Membership answers the question the defect asks: does the package declare
// this name anywhere? It cannot answer the narrower one — whether the target
// names the right symbol of several — and no renderer answers that either,
// because TSDoc declaration references are not resolved here.
//
// Scope stops at `src`, and `docs/` stays out on purpose. An audit records the
// dangling citation it fixed by quoting it, and a plan names the test file it
// proposes to add; nine such references sit under `docs/audits` and
// `docs/plans` today, every one of them deliberate. Those documents keep their
// authored voice. The curated surface docs beside them carry no citation at
// all, so the rule would buy nothing there either.

// Entries that hold no authored comment of this package's own.
const SKIP = new Set(['node_modules', 'dist'])

/**
 * Visit every file under `src` with its content, test and benchmark trees
 * included.
 *
 * @remarks
 * A local collector rather than `walkSource`, which prunes `__tests__`
 * and `__benchmarks__` by default and prunes them at every depth. Handing in
 * the two roots beside `src` is not enough: the docs engine carries a second
 * pair at `docs/engine/`, and a walk blind to those trees reads a file that
 * exists as a dangling citation. The walker's own remarks sanction this shape
 * for a rule that spans both trees at once.
 *
 * Both halves of this rule need both trees. Three of the four citation defects
 * the 2026-09-12 audit found sat inside a pruned tree, and so did one of its
 * five dangling links.
 */
function eachFile(visit: (file: string, content: string) => void): void {
	const walk = (dir: string) => {
		for (const entry of readdirSync(dir, { withFileTypes: true })) {
			if (entry.name.startsWith('.') || SKIP.has(entry.name)) continue

			const path = join(dir, entry.name)

			if (entry.isDirectory()) walk(path)
			else if (entry.isFile()) visit(path, readFileSync(path, 'utf8'))
		}
	}

	walk(srcDir)
}

const SOURCE_FILE = /\.tsx?$/

const MARKDOWN_FILE = /\.md$/

/** The script kind the parser and the scanner both read a file under. */
function scriptKind(file: string): ts.ScriptKind {
	return file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
}

// A concrete test or benchmark basename. The leading `[\w-]` is what separates
// a citation from a glob: `*.test.ts` in a config offers no word character
// before the dot, so it cannot start a match.
const CITATION = /\b[\w-][\w.-]*\.(?:test|bench)\.tsx?\b/g

/**
 * The text of every comment in a source file.
 *
 * @remarks
 * Scanned rather than parsed, because a comment that documents nothing is
 * trivia the parser attaches to no node. Reading comments alone is also what
 * keeps synthetic paths out of the result: the docs engine's api-extractor
 * suite asserts on the path of a test file that is not supposed to exist, and
 * a scan of whole file text would read that argument as a citation.
 */
function commentTexts(file: string, content: string): string[] {
	const scanner = ts.createScanner(
		ts.ScriptTarget.ESNext,
		false,
		file.endsWith('.tsx') ? ts.LanguageVariant.JSX : ts.LanguageVariant.Standard,
		content,
	)

	const texts: string[] = []

	for (let token = scanner.scan(); token !== ts.SyntaxKind.EndOfFileToken; token = scanner.scan()) {
		if (
			token === ts.SyntaxKind.SingleLineCommentTrivia ||
			token === ts.SyntaxKind.MultiLineCommentTrivia
		) {
			texts.push(scanner.getTokenText())
		}
	}

	return texts
}

/**
 * The identifier a node declares, or `undefined` when it declares none.
 *
 * @remarks
 * Read structurally rather than through `ts.getNameOfDeclaration`, which takes
 * a narrowed `Declaration`. Every shape that carries a name puts it on `name` —
 * a function, a type, a destructured binding, an import specifier, an object
 * member, a parameter — so one read collects them all.
 */
function declaredName(node: ts.Node): string | undefined {
	const { name } = node as ts.Node & { name?: ts.Node }

	return name && ts.isIdentifier(name) ? name.text : undefined
}

/** True for the three link forms TSDoc admits. */
function isLink(part: ts.Node): part is ts.JSDocLink | ts.JSDocLinkCode | ts.JSDocLinkPlain {
	return ts.isJSDocLink(part) || ts.isJSDocLinkCode(part) || ts.isJSDocLinkPlain(part)
}

/** The comment parts of a doccomment: its own body, then each tag's body. */
function commentParts(doc: ts.JSDoc): readonly (string | ts.Node)[] {
	const parts: (string | ts.Node)[] = []

	const push = (comment: ts.JSDoc['comment']) => {
		if (typeof comment === 'string') parts.push(comment)
		else if (comment) parts.push(...comment)
	}

	push(doc.comment)

	for (const tag of doc.tags ?? []) push(tag.comment)

	return parts
}

type LinkSite = { file: string; target: string }

/** Every name the package declares, and every `{@link}` target it names. */
function readDeclarationsAndLinks(): { declared: Set<string>; links: LinkSite[] } {
	const declared = new Set<string>()

	const links: LinkSite[] = []

	eachFile((file, content) => {
		if (!SOURCE_FILE.test(file)) return

		const source = ts.createSourceFile(
			file,
			content,
			ts.ScriptTarget.ESNext,
			true,
			scriptKind(file),
		)

		// One doccomment is reachable from several nodes, so each is read once.
		const read = new Set<ts.JSDoc>()

		const visit = (node: ts.Node) => {
			const name = declaredName(node)

			if (name) declared.add(name)

			for (const doc of ts.getJSDocCommentsAndTags(node)) {
				if (!ts.isJSDoc(doc) || read.has(doc)) continue

				read.add(doc)

				for (const part of commentParts(doc)) {
					if (typeof part === 'string' || !isLink(part) || !part.name) continue

					// `{@link https://example.com}` parses as the name `https` and the
					// text `://example.com`. An external link resolves against nothing
					// in this package and is not this rule's subject.
					if (part.text.startsWith('://')) continue

					links.push({ file: srcRelative(file), target: part.name.getText(source) })
				}
			}

			ts.forEachChild(node, visit)
		}

		visit(source)
	})

	return { declared, links }
}

/**
 * Every global the TypeScript standard library declares.
 *
 * @remarks
 * A link may name a platform type — `WeakMap`, `ResizeObserver` — which no file
 * here declares. Every shipped `lib.*.d.ts` is read, rather than the subset
 * `tsconfig.base.json` compiles against, so a link to a type outside the target
 * passes this gate rather than failing it. That is the safe direction: the rule
 * reports a name nothing declares, and admitting a few extra names loses a
 * defect it was never able to see.
 */
function libraryGlobals(): Set<string> {
	const libDir = dirname(ts.getDefaultLibFilePath({}))

	const globals = new Set<string>()

	for (const entry of readdirSync(libDir)) {
		if (!/^lib\..*\.d\.ts$/.test(entry)) continue

		const source = ts.createSourceFile(
			entry,
			readFileSync(join(libDir, entry), 'utf8'),
			ts.ScriptTarget.ESNext,
			true,
		)

		ts.forEachChild(source, (node) => {
			const name = declaredName(node)

			if (name) globals.add(name)
		})
	}

	return globals
}

describe('comment reference boundary', () => {
	it('every test or benchmark file a comment names exists', () => {
		const existing = new Set<string>()

		eachFile((file) => {
			if (/\.(?:test|bench)\.tsx?$/.test(file)) existing.add(basename(file))
		})

		const violations: string[] = []

		const report = (file: string, text: string) => {
			for (const match of text.matchAll(CITATION)) {
				if (!existing.has(match[0])) violations.push(`${srcRelative(file)} → ${match[0]}`)
			}
		}

		eachFile((file, content) => {
			// Markdown is prose end to end, and five of the nine defects that opened
			// this rule sat in a README rather than in a comment.
			if (MARKDOWN_FILE.test(file)) report(file, content)
			else if (SOURCE_FILE.test(file)) {
				for (const comment of commentTexts(file, content)) report(file, comment)
			}
		})

		expect(
			violations,
			`comments naming a test or benchmark file that does not exist — cite the rule's current home, or drop the citation (CONVENTIONS.md §12.4):\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('every {@link} target names a symbol the package or the platform declares', () => {
		const { declared, links } = readDeclarationsAndLinks()

		const globals = libraryGlobals()

		const violations: string[] = []

		const seen = new Set<string>()

		for (const { file, target } of links) {
			const key = `${file}|${target}`

			if (seen.has(key)) continue

			seen.add(key)

			// A member or a qualified target resolves through its head: `Props.size`
			// and `Class#method` both stand or fall with the declaration named first.
			const head = target.split(/[.#]/)[0]?.trim()

			if (!head || declared.has(head) || globals.has(head)) continue

			violations.push(`${file} → {@link ${target}}`)
		}

		expect(
			violations,
			`{@link} targets naming a symbol nothing declares — the renderer prints these as plain text, so none of them link (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
