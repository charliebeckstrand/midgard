import { relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, stripSourceComments, walkSource } from '../helpers/walk-source'

// `useFloating` rebuilds its `context` object on every reposition. A hook that
// names the whole object as a dependency therefore re-identifies on each
// `autoUpdate` tick, and everything downstream of that identity re-renders with
// it. `use-floating-ui.ts` states the rule in prose: `context.onOpenChange` is
// floating-ui's own effect event, one identity for the whole mount, so it is
// safe to name alone, while "depending on the whole `context` would not be
// safe".
//
// Prose alone did not hold it. Five call sites named the bare object, and one
// of them — `Menu`'s `dismissToTab` — fed the memo behind `MenuActionsContext`,
// so every `MenuItem` re-rendered as the panel moved. The other four were
// dormant only because their callbacks were not yet read through a memo. Each
// becomes the same defect the moment one is.
//
// This gate is the rule. A dependency array naming bare `context`, in a
// callback whose body only ever reads `context.<member>`, is a break: the
// member is the dependency. A body that passes `context` on as a value is not,
// because it needs the object.
//
// Scope: the identifier `context`, which is what every floating call site in
// the package names it, in a file that calls a `useFloating*` hook. A binding
// under another name is out of reach here, and `hook-type-name-boundary.test.ts`
// is the precedent for pinning a name rather than a shape.

/** Hooks whose last argument is a dependency array. */
const HOOKS = ['useCallback', 'useMemo', 'useEffect', 'useLayoutEffect', 'useInsertionEffect']

const HOOK_CALL = new RegExp(`\\b(${HOOKS.join('|')})\\(`, 'g')

/** A file obtains a floating context only from one of these. */
const FLOATING_SOURCE = /\buseFloating\w*\(/

/**
 * The call text starting at `open`, the index of a hook's opening parenthesis,
 * or null when the parentheses never balance. Quotes and template literals are
 * skipped, so a bracket inside a string cannot unbalance the scan.
 */
function callText(text: string, open: number): string | null {
	let depth = 0

	let quote: string | null = null

	for (let index = open; index < text.length; index++) {
		const char = text[index]

		if (quote) {
			if (char === '\\') index++
			else if (char === quote) quote = null

			continue
		}

		if (char === '"' || char === "'" || char === '`') {
			quote = char

			continue
		}

		if (char === '(') depth++
		else if (char === ')') {
			depth--

			if (depth === 0) return text.slice(open, index + 1)
		}
	}

	return null
}

/** The entries of the dependency array a hook call ends with, or null when it has none. */
function dependencies(call: string): string[] | null {
	const match = /,\s*\[([\s\S]*?)\]\s*,?\s*\)$/.exec(call)

	if (!match) return null

	return (match[1] ?? '')
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean)
}

/**
 * Whether every `context` in `body` is a member read. A bare mention — passed
 * on, spread, or returned — means the callback needs the object itself, and the
 * whole-object dependency is then correct.
 */
function readsMembersOnly(body: string): boolean {
	const mentions = [...body.matchAll(/(?<![\w$.])context\b(\??\.)?/g)]

	return mentions.length > 0 && mentions.every((mention) => mention[1] !== undefined)
}

describe('floating-context dependency boundary', () => {
	it('a hook depends on the floating context member it reads, not the context', () => {
		const violations: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			if (!FLOATING_SOURCE.test(content)) return

			const text = stripSourceComments(content)

			for (const match of text.matchAll(HOOK_CALL)) {
				const open = match.index + match[0].length - 1

				const call = callText(text, open)

				if (!call) continue

				const deps = dependencies(call)

				if (!deps?.includes('context')) continue

				// The body is the call without its dependency array, so an entry
				// there never reads as a mention.
				const body = call.slice(0, call.lastIndexOf('['))

				if (!readsMembersOnly(body)) continue

				const member = /(?<![\w$.])context\??\.(\w+)/.exec(body)?.[1] ?? 'onOpenChange'

				violations.push(
					`${relative(srcDir, file)} → ${match[1]} depends on [context] but reads context.${member}`,
				)
			}
		})

		expect(
			violations,
			`floating-ui rebuilds \`context\` on every reposition, so a hook naming it re-identifies as the panel moves — depend on the member instead (see hooks/use-floating-ui.ts):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('reads the call sites it is meant to cover', () => {
		// A scanner that silently matches nothing passes green while the rule it
		// guards rots. This holds the parser to the shape the package actually
		// writes: the narrowed dependency the gate asks for, at every site.
		const narrowed: string[] = []

		walkSource(srcDir, (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			if (!FLOATING_SOURCE.test(content)) return

			for (const match of stripSourceComments(content).matchAll(HOOK_CALL)) {
				const call = callText(stripSourceComments(content), match.index + match[0].length - 1)

				if (call && dependencies(call)?.includes('context.onOpenChange'))
					narrowed.push(relative(srcDir, file))
			}
		})

		expect(
			narrowed.sort(),
			'the sites that carry the narrowed dependency moved — extend this list, or the scanner above no longer parses the shape they are written in',
		).toEqual([
			'components/date-picker/use-date-picker-range-state.ts',
			'components/date-picker/use-date-picker-relative-state.ts',
			'components/date-picker/use-date-picker-state.ts',
			'components/listbox/listbox.tsx',
			'components/menu/use-menu-state.ts',
		])
	})
})
