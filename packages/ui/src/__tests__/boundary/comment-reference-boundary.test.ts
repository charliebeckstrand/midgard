import { readdirSync, readFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import {
	type EntityName,
	isIdentifier,
	isJSDocLink,
	isJSDocLinkCode,
	isJSDocLinkPlain,
	isJsxAttribute,
	isJsxNamespacedName,
	isMetaProperty,
	isPropertyAccessExpression,
	isQualifiedName,
	type JSDoc,
	type JSDocComment,
	type JSDocLink,
	type JSDocLinkCode,
	type JSDocLinkPlain,
	type Node,
} from 'typescript/unstable/ast'
import { afterAll, describe, expect, it } from 'vitest'
import { extractComments } from '../helpers/controlled-language'
import { docComments } from '../helpers/ts-ast'
import { startTypeScript, type TypeScriptServer } from '../helpers/ts-server'
import { isSourceFile, srcDir, srcRelative } from '../helpers/walk-source'

// A comment that names a file or a symbol states a fact about the tree, and the
// tree moves. CONVENTIONS.md §12.4 bans the nearest spelling of the defect — an
// audit named from code — on the ground that the reference dangles once the
// audit goes. These two cases hold that ground for the two references a scan
// can check: the name of a test or benchmark file, and a `{@link}` target.
//
// A hand sweep closed thirteen rows across both categories and added no gate,
// and both categories rotted inside a month. #1152 and #1164 moved eight
// boundary rules into `biome.json` and `.biome/plugins/`, and deleted the tests
// that had held them. Comments still named the deleted files. The contracts
// survived the move; only the pin changed, and no run said so.
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
//   `__benchmarks__/fixtures.ts` carried one of the five defects that the hand
//   sweep found.
//
// Membership answers the question the defect asks: does the package declare
// this name anywhere? It does not answer whether the target names the right
// symbol of several, which nothing in the tree answers today. The API
// reference renders every symbol target as plain text and resolves none, so
// no renderer index gates what a reader sees.
//
// Scope stops at `src`, and `docs/` stays out on purpose. An audit quotes the
// dangling citation it fixed, or records a test that does not exist, and a
// plan names the test file it proposes to add. A recount on 2026-09-23 found
// eight such references under `docs/audits` and `docs/plans`, and each one was
// deliberate. A gate there would report authored prose as drift, and those
// documents keep their authored voice. The curated surface docs beside them
// cite no test file, and `surface-index.test.ts` already holds their export
// rows. What stays unguarded is narrow: a future curated doc that cites a test.

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
 * under `docs-legacy/engine/`, and a list of roots goes quietly stale when a fifth
 * appears. A walk blind to any of them reads a file that exists as a dangling
 * citation.
 *
 * Both halves of this rule need those trees. Three of the four citation defects
 * that the hand sweep found sat inside a pruned tree, and so did one of its five
 * dangling links.
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

const MARKDOWN_FILE = /\.md$/

const TEST_FILE = /\.(?:test|bench)\.tsx?$/

// A concrete test or benchmark basename. The lookbehind is what separates a
// citation from a glob: `-` sits inside the character class, so without it
// `*-boundary.test.ts` in a config matches from its `b` and reports a file that
// was never named. No real citation opens after a `*` or a `-`, because a name
// that carries one matches from its own first character.
//
// A bare stem, with no extension, stays out of reach. Prose uses the same
// `-boundary` compound as a plain word, as in "calendar-boundary ticks", so a
// stem match cannot tell a citation from a word. A citation that this rule
// checks names its file in full.
const CITATION = /(?<![*-])\b[\w-][\w.-]*\.(?:test|bench)\.tsx?\b/g

// Emphasis around a name, as in `**recipe-boundary.test.ts**`, is Markdown and
// not a glob. The name opens after a `*`, which the lookbehind refuses, and an
// underscore run takes away the word boundary. So the markers go before the
// match. Each one turns into spaces of its own width, and an index keeps its
// line.
const EMPHASIZED = /(\*{1,2}|_{1,2})([\w-][\w.-]*\.(?:test|bench)\.tsx?)\1/g

/** `text` with the emphasis markers around each citation blanked out. */
function unemphasize(text: string): string {
	return text.replace(EMPHASIZED, (_, mark: string, name: string) => {
		const blank = ' '.repeat(mark.length)

		return `${blank}${name}${blank}`
	})
}

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
 * Read structurally, from the `name` of the node. Every shape that carries a
 * name puts it on `name` — a function, a type, a destructured binding, an
 * import specifier, an object member, a parameter — so one read collects them
 * all.
 *
 * Some references carry a `name` too: a property access, a JSX attribute and
 * its namespaced name, and `import.meta`. They declare nothing, so they are
 * skipped. Otherwise a link to a name that occurs only as `o.name` passes.
 */
function declaredName(node: Node): string | undefined {
	if (
		isPropertyAccessExpression(node) ||
		isJsxAttribute(node) ||
		isJsxNamespacedName(node) ||
		isMetaProperty(node)
	) {
		return undefined
	}

	const { name } = node as Node & { name?: Node }

	return name && isIdentifier(name) ? name.text : undefined
}

/** True for the three link forms TSDoc admits. */
function isLink(part: Node): part is JSDocLink | JSDocLinkCode | JSDocLinkPlain {
	return isJSDocLink(part) || isJSDocLinkCode(part) || isJSDocLinkPlain(part)
}

/**
 * The name of a link, or `undefined` for a link with no name, such as a
 * `{@link` with its target on the next line.
 *
 * @remarks
 * For a link with no name, the API of TypeScript 7 gives the node after the
 * link as its `name`. A real name is an identifier or a qualified name inside
 * the link, so the check of the kind and of the range keeps only a real name.
 */
function linkName(link: JSDocLink | JSDocLinkCode | JSDocLinkPlain): EntityName | undefined {
	const { name } = link

	return name &&
		(isIdentifier(name) || isQualifiedName(name)) &&
		name.pos >= link.pos &&
		name.end <= link.end
		? name
		: undefined
}

/** The node parts of a doccomment: its own body, then each tag's body. */
function commentParts(doc: JSDoc): readonly JSDocComment[] {
	const parts: JSDocComment[] = []

	const push = (comment: readonly JSDocComment[] | undefined) => {
		if (comment) parts.push(...comment)
	}

	push(doc.comment)

	for (const tag of doc.tags ?? []) push(tag.comment)

	return parts
}

type LinkSite = { file: string; line: number; target: string }

/** The name a `{@link}` target stands or falls with. */
function headOf(target: string): string | undefined {
	// A member or a qualified target resolves through its head: `Props.size`
	// and `Class#method` both stand or fall with the declaration named first.
	return target.split(/[.#]/)[0]?.trim() || undefined
}

/** Every name that the top level or any depth of `source` declares. */
function collectDeclared(source: Node, declared: Set<string>): void {
	const visit = (node: Node) => {
		const name = declaredName(node)

		if (name) declared.add(name)

		node.forEachChild(visit)
	}

	visit(source)
}

/**
 * Whether the text of a file can hold a declaration of one of `heads`.
 *
 * @remarks
 * A declared name is the text of an identifier, and that text is a substring
 * of the file, with one exception: an identifier can spell a character as a
 * `\u` escape, which the parse decodes. A file that holds such an escape is
 * therefore always a candidate. The test is a superset check, so a candidate
 * that declares nothing costs only its parse.
 */
function canDeclare(content: string, heads: readonly string[]): boolean {
	return content.includes('\\u') || heads.some((head) => content.includes(head))
}

/** Each head of a target in `links` that `declared` does not hold, once. */
function openHeads(links: readonly LinkSite[], declared: ReadonlySet<string>): string[] {
	const heads = new Set<string>()

	for (const { target } of links) {
		const head = headOf(target)

		if (head && !declared.has(head)) heads.add(head)
	}

	return [...heads]
}

/**
 * Every `{@link}` target the package names once per file, and the names that
 * the package declares, in so far as the targets need them.
 *
 * @remarks
 * The rule asks one question of the declared names: does a name hold the head
 * of a target? So the full set is not necessary, and its cost was most of this
 * case. The walk is in two passes:
 *
 * 1. Each file that holds a link is parsed, in one project of the TypeScript
 *    server. The same parse also gives the declarations of that file.
 * 2. The other files are parsed only when their text holds the head of a
 *    target that pass 1 did not find declared. A file whose text does not hold
 *    a name cannot declare it (see {@link canDeclare}), so the result for each
 *    target is the same as the result from a parse of every file.
 */
function readDeclarationsAndLinks(server: TypeScriptServer): {
	declared: Set<string>
	links: LinkSite[]
} {
	const declared = new Set<string>()

	const links: LinkSite[] = []

	const linked: string[] = []

	const rest: { file: string; content: string }[] = []

	eachFile((file, content) => {
		if (!isSourceFile(file)) return

		// About half of the tree carries no link at all. Without a link to find,
		// the parse is not worth its cost, and pass 2 reads the file for
		// declarations only when a target needs it. The guard is TypeScript's own
		// trigger — `{ @link Foo }` with a space parses to no link node, and
		// `{@linkcode` and `{@linkplain` both open with this prefix.
		if (content.includes('{@link')) linked.push(file)
		else rest.push({ file, content })
	})

	for (const [file, source] of server.parse(linked)) {
		// A doccomment is reachable from several nodes, so the same target is
		// visited more than once. The file is the reporting unit, so one target
		// per file is what this rule has to say.
		const seen = new Set<string>()

		const visit = (node: Node) => {
			const name = declaredName(node)

			if (name) declared.add(name)

			for (const doc of docComments(node)) {
				for (const part of commentParts(doc)) {
					const name = isLink(part) ? linkName(part) : undefined

					if (!name) continue

					// `{@link https://example.com}` parses as the name `https` and the
					// text `://example.com`. An external link resolves against nothing
					// in this package and is not this rule's subject.
					if (part.text.startsWith('://')) continue

					const target = name.getText()

					if (seen.has(target)) continue

					seen.add(target)

					links.push({
						file: srcRelative(file),
						line: source.getLineAndCharacterOfPosition(part.getStart()).line + 1,
						target,
					})
				}
			}

			node.forEachChild(visit)
		}

		visit(source)
	}

	const open = openHeads(links, declared)

	const candidates = rest.flatMap(({ file, content }) => (canDeclare(content, open) ? file : []))

	// Pass 2 reads declarations only.
	for (const source of server.parse(candidates).values()) collectDeclared(source, declared)

	return { declared, links }
}

/**
 * The directory of the TypeScript standard library, as the TypeScript server
 * reads it: the directory of the `lib.es5.d.ts` that a project with the `es5`
 * library holds.
 */
function libraryDir(server: TypeScriptServer): string {
	const probe = server.write('probe.ts', '')

	const { program } = server.open([probe], { lib: ['es5'], noResolve: true, types: [] })

	const es5 = program.getSourceFileNames().find((file) => basename(file) === 'lib.es5.d.ts')

	if (!es5) throw new Error('the TypeScript server read no lib.es5.d.ts')

	return dirname(es5)
}

/**
 * The globals of the TypeScript standard library, in so far as `heads` needs
 * them.
 *
 * @remarks
 * A link may name a platform type — `WeakMap`, `ResizeObserver` — which no file
 * here declares. Every shipped `lib.*.d.ts` is read, rather than the subset
 * `tsconfig.base.json` compiles against, so a link to a type outside the target
 * passes this gate rather than failing it. That is the safe direction: the rule
 * reports a name nothing declares, and admitting a few extra names loses a
 * defect it was never able to see.
 *
 * A library file is parsed only when its text can declare one of `heads`
 * (see {@link canDeclare}). The result for each head is thus the same as the
 * result from a parse of every library file.
 */
function libraryGlobals(server: TypeScriptServer, heads: readonly string[]): Set<string> {
	const libDir = libraryDir(server)

	const globals = new Set<string>()

	const candidates: string[] = []

	for (const entry of readdirSync(libDir)) {
		if (!/^lib\..*\.d\.ts$/.test(entry)) continue

		const file = join(libDir, entry)

		if (canDeclare(readFileSync(file, 'utf8'), heads)) candidates.push(file)
	}

	for (const source of server.parse(candidates).values()) {
		// Top-level declarations only: nothing below the source file is read.
		source.forEachChild((node) => {
			const name = declaredName(node)

			if (name) globals.add(name)
		})
	}

	return globals
}

describe('comment reference boundary', () => {
	// The TypeScript server parses each source that the cases read, and stops
	// after the last case.
	const server = startTypeScript()

	afterAll(() => server.close())

	it('every test or benchmark file a comment names in full exists', () => {
		const existing = new Set<string>()

		const cited: { file: string; line: number; name: string }[] = []

		// The files that can hold a citation, in the order of the walk. A Markdown
		// file keeps its text, and the server parses each source file below.
		const holders: { file: string; markdown?: string }[] = []

		// One pass: the same walk answers which files exist and which are named.
		eachFile((file, content) => {
			if (TEST_FILE.test(file)) existing.add(basename(file))

			// A comment's text is a substring of its file's text, so a file whose
			// text holds neither stem cannot hold a citation, and 2,183 of 2,256
			// source files hold neither. `.test.tsx` and `.bench.tsx` carry the same
			// two stems, so both spellings survive the guard.
			if (!content.includes('.test.ts') && !content.includes('.bench.ts')) return

			// Markdown is prose end to end, and five of the nine defects that opened
			// this rule sat in a README rather than in a comment.
			if (MARKDOWN_FILE.test(file)) holders.push({ file, markdown: content })
			else if (isSourceFile(file)) holders.push({ file })
		})

		// Comments only, read from the parse. `extractComments` gives the reason
		// that a scan without parser context fails. Reading comments alone keeps
		// a synthetic path out of the result: the docs engine's api-extractor
		// suite asserts on the path of a test file that is not supposed to exist.
		const sources = server.parse(
			holders.flatMap(({ file, markdown }) => (markdown === undefined ? file : [])),
		)

		for (const { file, markdown } of holders) {
			const collect = (text: string, line: (index: number) => number) => {
				for (const match of unemphasize(text).matchAll(CITATION)) {
					cited.push({ file: srcRelative(file), line: line(match.index), name: match[0] })
				}
			}

			const source = sources.get(file)

			if (markdown !== undefined) collect(markdown, (index) => lineAt(markdown, index))
			else if (source) {
				for (const comment of extractComments(source)) {
					collect(comment.text, () => comment.line)
				}
			}
		}

		const violations = cited
			.filter(({ name }) => !existing.has(name))
			.map(({ file, line, name }) => `${file}:${line} → ${name}`)

		expect(
			violations,
			`comments naming a test or benchmark file that does not exist — cite the rule's current home, or drop the citation:\n${violations.join('\n')}`,
		).toEqual([])
	})

	it('every {@link} target names a symbol the package or the platform declares', () => {
		const { declared, links } = readDeclarationsAndLinks(server)

		const globals = libraryGlobals(server, openHeads(links, declared))

		const violations: string[] = []

		for (const { file, line, target } of links) {
			const head = headOf(target)

			if (!head || declared.has(head) || globals.has(head)) continue

			violations.push(`${file}:${line} → {@link ${target}}`)
		}

		expect(
			violations,
			`{@link} targets naming a symbol no file here and no TypeScript library declares — repoint or drop each one (CONVENTIONS.md §12.1):\n${violations.join('\n')}`,
		).toEqual([])
	})
})
