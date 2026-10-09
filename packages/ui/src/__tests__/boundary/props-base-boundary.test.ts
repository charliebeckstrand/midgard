import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isSourceFile, srcDir, srcRelative, walkSource } from '../helpers/walk-source'

// `ComponentProps<'tag'>` is the only native-prop base (CONVENTIONS §4.3). It
// carries `ref`, so the older bases — which drop it — are gone: a props type
// built on one of them silently rejects a ref the component would forward.
// `SlotProps` was an exact alias of `ComponentProps` and is gone with them.

// Shipped-source directories. Tests, benchmarks, and the docs app are
// excluded.
const SCAN_DIRS = [
	'components',
	'core',
	'hooks',
	'layouts',
	'modules',
	'primitives',
	'providers',
	'recipes',
	'structure',
	'types',
	'utilities',
]

const BANNED = /\b(ComponentPropsWithoutRef|ComponentPropsWithRef|SlotProps)\s*</g

const ELEMENT_ATTRS = /\b[A-Za-z]*HTMLAttributes\s*</g

// A component that renders more than one element type cannot name a single
// `ComponentProps<'tag'>`: the arms are not mutually assignable. These keep the
// element-agnostic base, and with it no `ref`.
const ELEMENT_ATTRS_ALLOWED = new Map([
	['components/fieldset/message.tsx', 'renders a `<p>` or a `<div>`'],
	['components/stepper/stepper.tsx', 'renders a `<div>` or an `<ol>`'],
])

/**
 * The matches of `pattern` in the shipped source, outside the `allowed` files. `used` holds
 * each allowed file that still matches, so a test can report an entry that no longer applies.
 */
function scan(
	pattern: RegExp,
	allowed?: Map<string, string>,
): { violations: string[]; used: Set<string> } {
	const violations: string[] = []

	const used = new Set<string>()

	for (const dir of SCAN_DIRS) {
		walkSource(join(srcDir, dir), (file, content) => {
			if (!isSourceFile(file)) return

			const rel = srcRelative(file)

			const matches = [...content.matchAll(pattern)]

			if (allowed?.has(rel)) {
				if (matches.length > 0) used.add(rel)

				return
			}

			for (const match of matches) {
				violations.push(`${rel} → ${match[1] ?? match[0]}`)
			}
		})
	}

	return { violations, used }
}

describe('props base boundary', () => {
	it('no props type is built on a ref-dropping base', () => {
		const { violations } = scan(BANNED)

		expect(
			violations,
			`use \`ComponentProps<'tag'>\` — it carries \`ref\` (CONVENTIONS §4.3):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no props type is built on element attributes', () => {
		const { violations } = scan(ELEMENT_ATTRS, ELEMENT_ATTRS_ALLOWED)

		expect(
			violations,
			`use \`ComponentProps<'tag'>\`, or allowlist the multi-element case:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('every allowlist entry still names a file on an element-attributes base', () => {
		const { used } = scan(ELEMENT_ATTRS, ELEMENT_ATTRS_ALLOWED)

		const stale = [...ELEMENT_ATTRS_ALLOWED.keys()].filter((rel) => !used.has(rel))

		expect(stale, `entries that no longer apply:\n  ${stale.join('\n  ')}`).toEqual([])
	})
})
