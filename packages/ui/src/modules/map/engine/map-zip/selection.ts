/**
 * The language a territory is written in, and the matcher it compiles to. Three
 * forms carry every way a broker states coverage — a whole code, a leading
 * prefix, an inclusive range — and one parser reads all three out of the string
 * a caller types or pastes. A `!` in front of a term subtracts it, so a prefix
 * less its exceptions is one line rather than a range arithmetic exercise.
 *
 * The matcher compiles rather than walks. A territory runs to tens of rules and
 * an atlas runs to tens of thousands of codes, so a rule-by-rule test would be
 * the whole cost of the pass: a set of whole codes and a sorted list of merged
 * spans answer each code in one lookup and one bisect, however many rules stand
 * behind them.
 *
 * A prefix is a span, and compiles to one. `606` is every code from `60600` to
 * `60699`, which is what {@link lowest} and {@link highest} already widen a
 * stated range's ends to — so the two forms differ in how they are written and
 * not in what they mean, and a territory stating both merges them into one list
 * rather than holding two unrelated structures.
 *
 * Codes are compared as their five-digit strings rather than as numbers. Every
 * ZIP is five digits with its leading zeros kept — `01001` is Agawam,
 * Massachusetts, and `1001` is nothing — so string order and numeric order are
 * the same order here, and the string never loses a zero on the way through.
 */

import { digitsOnly } from '../../../../utilities'

/** How many digits a ZIP code holds; a ZCTA identity is exactly this wide. @internal */
const ZIP_LENGTH = 5

/**
 * An inclusive span, stated at any width: `60601-60640` between two codes, and
 * `600-609` between two prefixes — the ZIP3 span a broker states a whole region
 * by. Each end widens to the code it means, the low end down and the high end
 * up, so one rule reads both.
 *
 * @internal
 */
const RANGE_TERM = /^(\d{1,5})-(\d{1,5})$/

/**
 * A ZIP+4, `60601-1234`: one code, written with the delivery segment the map
 * cannot draw. Read before {@link RANGE_TERM}, which this shape also satisfies —
 * a written ZIP+4 is common and a span from `12340` to `60601` stated backwards
 * in that exact form is not.
 *
 * @internal
 */
const PLUS_FOUR_TERM = /^(\d{5})-\d{4}$/

/** A whole code, `60601`. @internal */
const CODE_TERM = /^\d{5}$/

/** A leading prefix, `6` through `6060` — the ZIP3 a broker states a region by. @internal */
const PREFIX_TERM = /^\d{1,4}$/

/** The separators between terms; a hyphen is never one, since a range is spelled with it. @internal */
const TERM_SEPARATOR = /[\s,;]+/

/** The space around a hyphen, removed so `606 - 610` reads as one range and not three terms. @internal */
const RANGE_SPACING = /\s*-\s*/g

/**
 * One rule of a territory: a whole code, a leading prefix, or an inclusive span.
 * A prefix is the ZIP3 form a broker states a region by — `606` is every code
 * from `60600` to `60699` — and holds one to four digits, since five digits is a
 * whole code.
 *
 * @internal
 */
export type MapZipRule =
	| { kind: 'code'; code: string }
	| { kind: 'prefix'; prefix: string }
	| { kind: 'range'; from: string; to: string }

/**
 * A parsed territory: the rules that add codes to it, the rules that take codes
 * back out, and the terms the parser could not read. The invalid terms are kept
 * rather than dropped so a field can mark what a reader mistyped — the map draws
 * from the rules alone and never from these.
 *
 * @internal
 */
export type MapZipRules = {
	include: MapZipRule[]
	exclude: MapZipRule[]
	invalid: string[]
}

/**
 * A territory as a caller states it: one string of terms, or a list of them. A
 * list joins before it parses, so `['606', '60640-60649']` and
 * `'606, 60640-60649'` are the same territory.
 */
export type MapZipSelection = string | readonly string[]

/**
 * A stated territory as one string, whichever form it arrived in. The one place
 * a list becomes text, so a caller keying work on a territory's content and the
 * parser reading that territory can never disagree about what a list means.
 *
 * @internal
 */
export function zipSelectionText(selection: MapZipSelection): string {
	return typeof selection === 'string' ? selection : selection.join(',')
}

/** The lowest code a term of any width covers — `606` starts at `60600`. @internal */
function lowest(term: string): string {
	return term.padEnd(ZIP_LENGTH, '0')
}

/** The highest code a term of any width covers — `606` ends at `60699`. @internal */
function highest(term: string): string {
	return term.padEnd(ZIP_LENGTH, '9')
}

/** Reads one term, or `null` where it names no rule. @internal */
function readRule(term: string): MapZipRule | null {
	// A ZIP+4 names one delivery segment inside a code, and no atlas draws below
	// the code — so the segment is dropped and the code stands. `ZipcodeInput`
	// emits this form, which is what makes a pasted field's output parse as-is.
	// Read first, because a range would read this shape as a span as well.
	const plusFour = PLUS_FOUR_TERM.exec(term)

	if (plusFour) return { kind: 'code', code: plusFour[1] as string }

	const range = RANGE_TERM.exec(term)

	if (range) {
		const [, first = '', second = ''] = range

		// Reversed ends still name the span the reader meant, so they are ordered
		// rather than refused: `60640-60601` and `60601-60640` are one territory.
		// Ordered on the low bounds, so the widening below can never invert a span
		// stated across two widths.
		const [low, high] = lowest(first) <= lowest(second) ? [first, second] : [second, first]

		return { kind: 'range', from: lowest(low), to: highest(high) }
	}

	if (CODE_TERM.test(term)) return { kind: 'code', code: term }

	if (PREFIX_TERM.test(term)) return { kind: 'prefix', prefix: term }

	return null
}

/**
 * Reads a territory from the terms a caller states it in. Terms are separated by
 * commas, semicolons, or space, and a `!` in front of one subtracts it from the
 * result rather than adding it.
 *
 * Space around a hyphen closes up first, so `60601 - 60640` reads as the one
 * range it looks like. A term that names no rule lands in `invalid` and is
 * otherwise ignored, so one typo never voids the rest of a pasted territory.
 *
 * @param selection - The terms, as one string or a list of them.
 * @returns The rules that add, the rules that subtract, and the unreadable terms.
 *
 * @internal
 */
export function parseZipSelection(selection: MapZipSelection): MapZipRules {
	const terms = zipSelectionText(selection)
		.replace(RANGE_SPACING, '-')
		.split(TERM_SEPARATOR)
		.filter(Boolean)

	const rules: MapZipRules = { include: [], exclude: [], invalid: [] }

	for (const term of terms) {
		const negated = term.startsWith('!')

		const rule = readRule(negated ? term.slice(1) : term)

		if (rule === null) rules.invalid.push(term)
		else if (negated) rules.exclude.push(rule)
		else rules.include.push(rule)
	}

	return rules
}

/** A compiled half of a territory — the include side or the exclude side. @internal */
type ZipIndex = {
	codes: Set<string>
	/** Spans sorted by their low end and merged, so a bisect decides one. */
	ranges: { from: string; to: string }[]
}

/**
 * The spans sorted by their low end and merged where they overlap, so a bisect
 * over the result has one candidate to test rather than a run of them. Two spans
 * that merely abut stay apart, which costs one extra candidate and saves the
 * engine an idea of what the code after `60640` is.
 *
 * @internal
 */
function mergeSpans(spans: { from: string; to: string }[]): { from: string; to: string }[] {
	const sorted = [...spans].sort((a, b) => (a.from < b.from ? -1 : a.from > b.from ? 1 : 0))

	const ranges: { from: string; to: string }[] = []

	for (const span of sorted) {
		const last = ranges[ranges.length - 1]

		if (last !== undefined && span.from <= last.to) {
			if (span.to > last.to) last.to = span.to

			continue
		}

		ranges.push({ from: span.from, to: span.to })
	}

	return ranges
}

/**
 * Compiles one side's rules into the two lookups a match reads. A prefix widens
 * to the span it names, so it joins the spans rather than needing an index of
 * its own. The spans sort and merge here rather than at each test, so the pass
 * pays that once for a territory rather than once for every code in the atlas.
 *
 * @internal
 */
function compile(rules: MapZipRule[]): ZipIndex {
	const codes = new Set<string>()

	const spans: { from: string; to: string }[] = []

	for (const rule of rules) {
		if (rule.kind === 'code') codes.add(rule.code)
		else if (rule.kind === 'range') spans.push(rule)
		else spans.push({ from: lowest(rule.prefix), to: highest(rule.prefix) })
	}

	return { codes, ranges: mergeSpans(spans) }
}

/** Whether any range holds the code, by bisect over the sorted merged spans. @internal */
function inRanges(ranges: { from: string; to: string }[], code: string): boolean {
	let low = 0

	let high = ranges.length - 1

	// Finds the last span starting at or below the code. The spans are sorted and
	// disjoint, so that one is the only span that can hold it.
	while (low <= high) {
		const middle = (low + high) >> 1

		const span = ranges[middle]

		if (span === undefined) return false

		if (span.from > code) high = middle - 1
		else if (span.to < code) low = middle + 1
		else return true
	}

	return false
}

/** Whether the compiled side holds the code. @internal */
function holds(index: ZipIndex, code: string): boolean {
	return index.codes.has(code) || inRanges(index.ranges, code)
}

/**
 * The five-digit code a value names, or `null` where it names none. Non-digits
 * fall away first, so `60601-1234` and `IL 60601` both read as `60601`; anything
 * left short of five digits is not a code and matches nothing.
 *
 * @internal
 */
function normalizeZip(value: string): string | null {
	const digits = digitsOnly(value)

	return digits.length < ZIP_LENGTH ? null : digits.slice(0, ZIP_LENGTH)
}

/**
 * Compiles a territory into the test the coverage pass runs against every code
 * in the atlas. A code is covered when the include side holds it and the exclude
 * side does not.
 *
 * An empty include side covers nothing, whatever the exclude side holds: a
 * territory is what a broker states, and stating only exceptions states no
 * territory. That is what makes an empty selection draw an empty map rather than
 * the whole atlas.
 *
 * @param rules - The parsed territory.
 * @returns A test over one code, holding the compiled lookups.
 *
 * @internal
 */
export function zipMatcher(rules: MapZipRules): (zip: string) => boolean {
	const include = compile(rules.include)

	if (include.codes.size === 0 && include.ranges.length === 0) return () => false

	const exclude = compile(rules.exclude)

	// `holds` on an empty side is already false — an empty Set misses, and the
	// bisect exits before its first compare — so the exclude side needs no guard
	// of its own.
	return (zip: string) => {
		const code = normalizeZip(zip)

		return code !== null && holds(include, code) && !holds(exclude, code)
	}
}
