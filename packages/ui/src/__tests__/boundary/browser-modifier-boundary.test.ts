import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, stripSourceComments, walkSource } from '../helpers/walk-source'

// Browser-modifier boundary.
//
// A key press or a click that holds Ctrl, Meta, or Alt is for the browser. The
// test has one home, `hasBrowserModifier` in `utilities/modifier-keys.ts`.
// Before, each handler wrote its own copy, and three files kept the same local
// helper.
//
// So no source file writes the three-key test by hand: neither the `||` chain
// nor the negated `&&` chain, in any order. A file that keeps its own chain is
// on the list below with the reason. The scan reads the docs site too.

/** The one file that owns the test. */
const HOME = 'utilities/modifier-keys.ts'

/** Files that keep a hand-written chain, each with the reason. */
const KEPT: Record<string, string> = {
	'modules/grid/use-grid-cursor.tsx':
		'`isPlainPress` also reads `composing`, and the grid key tests read one `press` record',
}

const KEY = String.raw`\.(ctrlKey|metaKey|altKey)\b`

/** Three modifier reads on one receiver, joined by `||`. */
const ANY_CHAIN = new RegExp(String.raw`(\w+)${KEY}\s*\|\|\s*\1${KEY}\s*\|\|\s*\1${KEY}`, 'g')

/** Three negated modifier reads on one receiver, joined by `&&`. */
const NONE_CHAIN = new RegExp(String.raw`!(\w+)${KEY}\s*&&\s*!\1${KEY}\s*&&\s*!\1${KEY}`, 'g')

/** Whether a source text spells the three-key test by hand. */
function writesChain(code: string): boolean {
	for (const chain of [ANY_CHAIN, NONE_CHAIN]) {
		for (const match of code.matchAll(chain)) {
			if (new Set(match.slice(2)).size === 3) return true
		}
	}

	return false
}

/** Every source file, the docs site included, that spells the three-key test by hand. */
function chainFiles(): Set<string> {
	const files = new Set<string>()

	walkSource(srcDir, (path, source) => {
		if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

		const rel = srcRelative(path)

		if (rel === HOME) return

		// Prose that names the keys is not a use of them.
		if (writesChain(stripSourceComments(source))) files.add(rel)
	})

	return files
}

describe('browser-modifier boundary', () => {
	it('finds each spelling of the chain', () => {
		expect(writesChain('event.ctrlKey || event.metaKey || event.altKey')).toBe(true)
		expect(writesChain('a || event.altKey ||\n\t\tevent.ctrlKey || event.metaKey || b')).toBe(true)
		expect(writesChain('!press.metaKey && !press.altKey && !press.ctrlKey')).toBe(true)
		expect(writesChain('event.ctrlKey || event.ctrlKey || event.altKey')).toBe(false)
		expect(writesChain('event.ctrlKey || other.metaKey || event.altKey')).toBe(false)
		expect(writesChain('(press.ctrlKey || press.altKey) && !press.metaKey')).toBe(false)
	})

	it('routes every Ctrl, Meta, and Alt test through the helper', () => {
		const violations = [...chainFiles()].filter((rel) => !(rel in KEPT))

		expect(
			violations,
			`files that test Ctrl, Meta, and Alt by hand (call \`hasBrowserModifier\` from \`utilities/modifier-keys\`, or list the file in KEPT with the reason):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('lists only files that still keep a chain', () => {
		const files = chainFiles()

		const stale = Object.keys(KEPT).filter((rel) => !files.has(rel))

		expect(stale, `KEPT entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
