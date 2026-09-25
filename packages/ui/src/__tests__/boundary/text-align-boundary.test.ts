import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// Text-align boundary.
//
// A start alignment is `text-start`, not `text-left`. The two render the same
// in a left-to-right layout. In a right-to-left layout, `text-left` aligns the
// text to the inline end. Most sites set the alignment on a `<button>`, whose
// default centres its text, so the class only restores the start alignment.
//
// One site keeps a physical alignment: the `align` map of `kata/markdown`. A
// GitHub table column that `:---` marks is left-aligned by name, and the map
// renders that name as the author wrote it.

// Every layer that spells Tailwind classes.
const SCAN_ROOTS = [
	join(srcDir, 'recipes'),
	join(srcDir, 'components'),
	join(srcDir, 'modules'),
	join(srcDir, 'primitives'),
	join(srcDir, 'layouts'),
	join(srcDir, 'hooks'),
	join(srcDir, 'docs'),
].filter((root) => existsSync(root))

/** The one file that keeps a physical left alignment, and the one line of it. */
const MARKDOWN = 'recipes/kata/markdown.ts'

const MARKDOWN_ALIGN = /align: \{ left: 'text-left'/

const TEXT_LEFT = /\btext-left\b/

/** A line that holds only a comment. */
const COMMENT_LINE = /^\s*(?:\/\/|\*|\/\*|\{\/\*)/

describe('text-align boundary', () => {
	it('aligns to the start with text-start, not text-left', () => {
		const violations: string[] = []

		for (const root of SCAN_ROOTS) {
			walkSource(root, (path, source) => {
				if (!/\.(?:tsx?|mts|cts)$/.test(path)) return

				const rel = srcRelative(path)

				source.split('\n').forEach((line, index) => {
					if (!TEXT_LEFT.test(line)) return

					// Prose that names the class is not a use of it.
					if (COMMENT_LINE.test(line)) return

					if (rel === MARKDOWN && MARKDOWN_ALIGN.test(line)) return

					violations.push(`${rel}:${index + 1}`)
				})
			})
		}

		expect(
			violations,
			`sites that spell \`text-left\` (use \`text-start\`, which follows the direction):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
