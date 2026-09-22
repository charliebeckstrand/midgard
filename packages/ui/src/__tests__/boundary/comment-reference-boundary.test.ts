import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { extractComments } from '../helpers/controlled-language'
import { srcDir, srcRelative } from '../helpers/walk-source'

// A comment that names a file or a symbol states a fact about the tree, and the
// tree moves. CONVENTIONS.md §12.4 bans the nearest spelling of the defect — an
// audit named from code — on the ground that the reference dangles once the
// audit goes. These two cases hold that ground for the two references a scan
// can check: the name of a test or benchmark file, and a `{@link}` target.
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
// this name anywhere? Two narrower questions it does not answer, both stated
// here so the failure message does not have to overreach:
//
//   Whether the target names the right symbol of several, which nothing in the
//   tree answers today. And whether the target renders as a link, which
//   `docs/engine/api-reference/engine/link-resolver.ts` decides on a much
//   smaller index — PascalCase top-level declarations outside `docs/`. 652 of
//   this tree's 2,515 targets have a lowercase head, `dataAttr` among them, so
//   they resolve here and render as plain text there. Gating on that index is
//   the stronger rule and a larger change: it starts red on those 652.
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
 * A local collector rather than `walkSource`, whose `SKIP` set is module-private
 * and whose `skip` parameter only adds to it, so a caller can prune more and
 * never less. Naming the pruned roots instead of walking them does not scale:
 * the tree holds four such trees, because the docs engine keeps its own pair
 * under `docs/engine/`, and a list of roots goes quietly stale when a fifth
 * appears. A walk blind to any of them reads a file that exists as a dangling
 * citation.
 *
 * Both halves of this rule need those trees. Three of the four citation defects
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

const TEST_FILE = /\.(?:test|bench)\.tsx?$/

// A concrete test or benchmark basename. The lookbehind is what separates a
// citation from a glob: `-` sits inside the character class, so without it
// `*-boundary.test.ts` in a config matches from its `b` and reports a file that
// was never named. No real citation opens after a `*` or a `-`, because a name
// that carries one matches from its own first character.
const CITATION = /(?<![*-])\b[\w-][\w.-]*\.(?:test|bench)\.tsx?\b/g

/** The 1-based line `index` falls on, for a violation the reader has to open. */
function lineAt(content: string, index: number): number {
	let line = 1

	for (
		let at = content.indexOf('\n');
		at !== -1 && at < index;
		at = content.indexOf('\n', at + 1)
	) {
		line++
	}

	return line
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

/**
 * The node parts of a doccomment: its own body, then each tag's body.
 *
 * @remarks
 * A `comment` is a plain string when the doccomment holds no inline tag at all,
 * and a link is a node by construction, so the string form carries nothing this
 * rule reads and is dropped here rather than at the call site.
 */
function commentParts(doc: ts.JSDoc): readonly ts.JSDocComment[] {
	const parts: ts.JSDocComment[] = []

	const push = (comment: ts.JSDoc['comment']) => {
		if (typeof comment !== 'string' && comment) parts.push(...comment)
	}

	push(doc.comment)

	for (const tag of doc.tags ?? []) push(tag.comment)

	return parts
}

type LinkSite = { file: string; line: number; target: string }

/** Every name the package declares, and every `{@link}` target it names once. */
function readDeclarationsAndLinks(): { declared: Set<string>; links: LinkSite[] } {
	const declared = new Set<string>()

	const links: LinkSite[] = []

	eachFile((file, content) => {
		if (!SOURCE_FILE.test(file)) return

		// Two thirds of the tree carries no link at all. `getJSDocCommentsAndTags`
		// reads parent pointers, so the lookup and the cost of building them move
		// together: without a link to find, neither is worth paying, and the
		// `declared` walk below still covers every file. The guard is TypeScript's
		// own trigger — `{ @link Foo }` with a space parses to no link node, and
		// `{@linkcode` and `{@linkplain` both open with this prefix.
		const hasLink = content.includes('{@link')

		const source = ts.createSourceFile(file, content, ts.ScriptTarget.ESNext, hasLink)

		// A doccomment is reachable from several nodes, so the same target is
		// visited more than once. The file is the reporting unit, so one target
		// per file is what this rule has to say.
		const seen = new Set<string>()

		const visit = (node: ts.Node) => {
			const name = declaredName(node)

			if (name) declared.add(name)

			for (const doc of hasLink ? ts.getJSDocCommentsAndTags(node) : []) {
				if (!ts.isJSDoc(doc)) continue

				for (const part of commentParts(doc)) {
					if (!isLink(part) || !part.name) continue

					// `{@link https://example.com}` parses as the name `https` and the
					// text `://example.com`. An external link resolves against nothing
					// in this package and is not this rule's subject.
					if (part.text.startsWith('://')) continue

					const target = part.name.getText(source)

					if (seen.has(target)) continue

					seen.add(target)

					links.push({
						file: srcRelative(file),
						line: source.getLineAndCharacterOfPosition(part.getStart(source)).line + 1,
						target,
					})
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

		// Top-level declarations only, and no parent pointers: nothing below the
		// source file is read, so the parse stays as cheap as the read.
		const source = ts.createSourceFile(
			entry,
			readFileSync(join(libDir, entry), 'utf8'),
			ts.ScriptTarget.ESNext,
			false,
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

		const cited: { file: string; line: number; name: string }[] = []

		// One pass: the same walk answers which files exist and which are named.
		eachFile((file, content) => {
			if (TEST_FILE.test(file)) existing.add(basename(file))

			// A comment's text is a substring of its file's text, so a file whose
			// text holds neither stem cannot hold a citation, and 2,183 of 2,256
			// source files hold neither. `.test.tsx` and `.bench.tsx` carry the same
			// two stems, so both spellings survive the guard.
			if (!content.includes('.test.ts') && !content.includes('.bench.ts')) return

			const collect = (text: string, line: (index: number) => number) => {
				for (const match of text.matchAll(CITATION)) {
					cited.push({ file: srcRelative(file), line: line(match.index), name: match[0] })
				}
			}

			// Markdown is prose end to end, and five of the nine defects that opened
			// this rule sat in a README rather than in a comment.
			if (MARKDOWN_FILE.test(file)) collect(content, (index) => lineAt(content, index))
			else if (SOURCE_FILE.test(file)) {
				// Comments only, read from the parse. `extractComments` gives the reason
				// that a scan without parser context fails. Reading comments alone keeps
				// a synthetic path out of the result: the docs engine's api-extractor
				// suite asserts on the path of a test file that is not supposed to exist.
				for (const comment of extractComments(file, content)) {
					collect(comment.text, () => comment.line)
				}
			}
		})

		const violations = cited
			.filter(({ name }) => !existing.has(name))
			.map(({ file, line, name }) => `${file}:${line} → ${name}`)

		expect(
			violations,
			`comments naming a test or benchmark file that does not exist — cite the rule's current home, or drop the citation:\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('every {@link} target names a symbol the package or the platform declares', () => {
		const { declared, links } = readDeclarationsAndLinks()

		const globals = libraryGlobals()

		const violations: string[] = []

		for (const { file, line, target } of links) {
			// A member or a qualified target resolves through its head: `Props.size`
			// and `Class#method` both stand or fall with the declaration named first.
			const head = target.split(/[.#]/)[0]?.trim()

			if (!head || declared.has(head) || globals.has(head)) continue

			violations.push(`${file}:${line} → {@link ${target}}`)
		}

		expect(
			violations,
			`{@link} targets naming a symbol no file here and no TypeScript library declares — repoint or drop each one (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
