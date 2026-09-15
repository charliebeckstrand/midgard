import { join } from 'node:path'
import { srcDir, srcRelative, walkSource } from './walk-source'

/**
 * The controlled-language scan the 2026-08-02 documentation audit ran by hand,
 * as a reusable reader. It reports the rule 4, rule 6, and rule 10 breaks in
 * the comments of the shipped tree (STE.md).
 *
 * @remarks
 * The scan reads comments only. Code is never prose, and a rule that bans a
 * word must not read an identifier that contains it.
 */

/** A comment lifted out of a source file, with the line it opens on. */
export type Comment = { text: string; line: number; block: boolean }

/**
 * Every comment in `source`, block and line alike.
 *
 * @remarks
 * A character reader, not a regular expression. It steps over string and
 * template literals, so a `//` inside a URL literal opens no comment, and it
 * counts newlines as it goes, so each result carries a true line number.
 */
export function extractComments(source: string): Comment[] {
	const found: Comment[] = []

	let index = 0
	let line = 1
	let state: 'code' | 'block' | 'line' = 'code'
	let buffer = ''
	let opened = 0

	while (index < source.length) {
		const char = source[index]
		const next = source[index + 1]

		if (state === 'code') {
			if (char === '\n') line++

			if (char === '/' && next === '*') {
				state = 'block'
				buffer = ''
				opened = line
				index += 2
				continue
			}

			if (char === '/' && next === '/') {
				state = 'line'
				buffer = ''
				opened = line
				index += 2
				continue
			}

			if (char === '"' || char === "'" || char === '`') {
				index = skipLiteral(source, index, char, (crossed) => {
					line += crossed
				})
				continue
			}

			index++
			continue
		}

		if (state === 'block') {
			if (char === '\n') line++

			if (char === '*' && next === '/') {
				found.push({ text: buffer, line: opened, block: true })
				state = 'code'
				index += 2
				continue
			}

			buffer += char
			index++
			continue
		}

		if (char === '\n') {
			found.push({ text: buffer, line: opened, block: false })
			state = 'code'
			line++
			index++
			continue
		}

		buffer += char
		index++
	}

	if (state !== 'code') found.push({ text: buffer, line: opened, block: state === 'block' })

	return found
}

/** Step past the literal that opens at `start`, reporting the newlines crossed. */
function skipLiteral(
	source: string,
	start: number,
	quote: string,
	crossed: (lines: number) => void,
): number {
	let index = start + 1
	let lines = 0

	while (index < source.length) {
		if (source[index] === '\\') {
			index += 2
			continue
		}

		if (source[index] === '\n') lines++

		if (source[index] === quote) break

		index++
	}

	crossed(lines)

	return index + 1
}

// Tags whose payload is code or a bare value, never prose to measure.
const SKIP_TAGS = new Set(['example', 'defaultValue', 'see', 'internal', 'packageDocumentation'])

/**
 * The prose in one comment, split into the units a sentence rule applies to.
 *
 * @remarks
 * A doccomment is not one run of prose. The summary, each `@tag` payload, each
 * paragraph, and each list item are separate units. A reader that joins them
 * measures one long run and reports a break that no sentence carries.
 */
export function proseUnits(comment: Comment): string[] {
	const stripped = comment.text
		.split('\n')
		.map((row) => row.replace(/^\s*\*\s?/, ''))
		.join('\n')
		.replace(/```[\s\S]*?```/g, '\n')

	const units: string[] = []

	for (const chunk of stripped.split(/\n(?=\s*@\w+)/)) {
		const tag = /^\s*@(\w+)\s*/.exec(chunk)

		if (tag && SKIP_TAGS.has(tag[1] as string)) continue

		let body = tag ? chunk.slice(tag[0].length) : chunk

		if (tag?.[1] === 'param' || tag?.[1] === 'typeParam') body = body.replace(/^\S+\s*-\s*/, '')

		for (const paragraph of body.split(/\n\s*\n/)) {
			for (const item of paragraph.split(/\n(?=\s*[-*+]\s)/)) {
				const text = normalize(item)

				if (text) units.push(text)
			}
		}
	}

	return units
}

/**
 * Reduce a prose unit to the words a rule counts.
 *
 * @remarks
 * A `{@link}` target, an inline code span, and a Markdown link each stand for
 * one word. They name a thing, so they read as one term however many tokens
 * they hold.
 *
 * Emphasis markers go last. A sentence that ends inside bold — `math.** The` —
 * hides its full stop from the sentence reader, which then measures two
 * sentences as one and reports a break neither carries.
 */
export function normalize(text: string): string {
	return text
		.replace(/\{@link\s+[^}]*\}/g, 'LINK')
		.replace(/\{@label\s+[^}]*\}/g, '')
		.replace(/`[^`]*`/g, 'CODE')
		.replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
		.replace(/^\s*[-*+]\s+/, '')
		.replace(/^\s*>\s?/, '')
		.replace(/\*\*([^*]+)\*\*/g, '$1')
		.replace(/\*([^*]+)\*/g, '$1')
		.replace(/\s+/g, ' ')
		.trim()
}

/**
 * The sentences in a prose unit.
 *
 * @remarks
 * A semicolon joins independent clauses into one sentence, so this reader does
 * not split on it. Rule 6 caps the sentence, and a 70-word run of clauses is
 * the break the cap exists to catch. A unit with no terminal punctuation is one
 * sentence.
 */
export function sentences(text: string): string[] {
	return text
		.split(/(?<=[.!?])\s+(?=[A-Z([`"'])/)
		.map((part) => part.trim())
		.filter(Boolean)
}

/** The words in a sentence: a token carrying a letter or a digit. */
export function wordCount(sentence: string): number {
	return sentence.split(/\s+/).filter((word) => /[A-Za-z0-9]/.test(word)).length
}

// Rule 6 caps an instruction at 20 words and a descriptive sentence at 25. A
// sentence that opens with a bare verb is the instruction.
const IMPERATIVE =
	/^(?:Use|Do|Call|Pass|Set|Add|Keep|Write|Read|Put|Give|Make|Take|Never|Always|Prefer|Avoid|Return|Check|Run|Treat|Apply|Start|Stop|Consult|See|Note|Reach|Leave|Drop|Wire|Mount|Render|Hide|Show)\b/

/** The rule 6 word cap for `sentence`: 20 for an instruction, 25 otherwise. */
export function wordLimit(sentence: string): number {
	return IMPERATIVE.test(sentence) ? 20 : 25
}

/** Rule 10 bans these three modals outright; `must` and `can` replace them. */
export const MODAL = /\b(?:may|shall|should)\b/i

/** One rule break, located well enough to fix without a second scan. */
export type Break = { file: string; line: number; rule: 6 | 10; text: string }

/** Every rule break in one source text, reported against `file`. */
export function fileBreaks(file: string, source: string): Break[] {
	const breaks: Break[] = []

	for (const comment of extractComments(source)) {
		for (const unit of proseUnits(comment)) {
			for (const sentence of sentences(unit)) {
				if (wordCount(sentence) > wordLimit(sentence)) {
					breaks.push({ file, line: comment.line, rule: 6, text: sentence })
				}

				if (MODAL.test(sentence)) {
					breaks.push({ file, line: comment.line, rule: 10, text: sentence })
				}
			}
		}
	}

	return breaks
}

// The audit's own scope: the shipped tree, less the demo pages. walkSource
// prunes the test and benchmark trees already.
const SKIP_ENTRIES = new Set(['demos'])

const SOURCE_FILE = /\.tsx?$/

/** Every rule break in the shipped tree, in file order. */
export function scanPackage(): Break[] {
	const breaks: Break[] = []

	walkSource(
		srcDir,
		(file, content) => {
			if (!SOURCE_FILE.test(file)) return

			breaks.push(...fileBreaks(srcRelative(file), content))
		},
		SKIP_ENTRIES,
	)

	return breaks.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/**
 * The living Markdown the audit scoped: the curated surface docs and the hub
 * (CONVENTIONS.md §12.2). Paths are relative to the package root.
 */
export const LIVING_MARKDOWN = [
	'REFERENCE.md',
	'docs/README.md',
	'docs/COMPONENTS.md',
	'docs/CORE.md',
	'docs/HOOKS.md',
	'docs/LAYOUTS.md',
	'docs/MODULES.md',
	'docs/PRIMITIVES.md',
	'docs/PROVIDERS.md',
	'docs/RECIPES.md',
	'docs/UTILITIES.md',
]

/** Absolute path of the package root, which the living Markdown sits under. */
export const packageDir = join(srcDir, '..')

/**
 * Every rule 6 and rule 10 break in one Markdown document.
 *
 * @remarks
 * A table cell is its own descriptive unit. A reader that measures the whole
 * row counts the column scaffold as sentence text, and then reports a break the
 * prose does not carry.
 *
 * A unit that holds a `·` is an index list, not a sentence. The component,
 * module, and primitive indexes name their directories that way, and so does
 * every "See also" line.
 */
export function markdownBreaks(file: string, source: string): Break[] {
	const breaks: Break[] = []

	let fenced = false

	source.split('\n').forEach((row, index) => {
		if (/^\s*```/.test(row)) {
			fenced = !fenced
			return
		}

		if (fenced) return

		const cells = /^\s*\|[\s:|-]+\|\s*$/.test(row) ? [] : row.split('|').slice(1, -1)

		const units = /^\s*\|/.test(row) ? cells : [row.replace(/^#+\s*/, '')]

		for (const unit of units) {
			if (unit.includes('·')) continue

			const text = normalize(unit)

			if (!text) continue

			for (const sentence of sentences(text)) {
				if (wordCount(sentence) > wordLimit(sentence)) {
					breaks.push({ file, line: index + 1, rule: 6, text: sentence })
				}

				if (MODAL.test(sentence)) {
					breaks.push({ file, line: index + 1, rule: 10, text: sentence })
				}
			}
		}
	})

	return breaks
}
