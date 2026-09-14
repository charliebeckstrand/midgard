import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import { srcDir, walkSource } from '../helpers/walk-source'

// `ComponentProps<'tag'>` is the only native-prop base (CONVENTIONS §4.3). It
// carries `ref`, so the older bases — which drop it — are gone: a props type
// built on one of them silently rejects a ref the component would forward.
// `SlotProps` was an exact alias of `ComponentProps` and is gone with them.

// Shipped-source directories. Tests, benchmarks, and the docs engine are
// excluded; the docs engine names the old bases to extract pass-through from
// third-party code.
const SCAN_DIRS = [
	'components',
	'core',
	'hooks',
	'layouts',
	'modules',
	'primitives',
	'providers',
	'recipes',
	'types',
	'utilities',
]

const BANNED = /\b(ComponentPropsWithoutRef|ComponentPropsWithRef|SlotProps)\s*</g

const ELEMENT_ATTRS = /\b[A-Za-z]*HTMLAttributes\s*</g

// A component that renders more than one element type cannot name a single
// `ComponentProps<'tag'>`: the arms are not mutually assignable. These keep the
// element-agnostic base, and with it no `ref`.
const ELEMENT_ATTRS_ALLOWED = new Map([
	['components/fieldset/message.tsx', 'renders a `<p>` or a `<ul>`'],
	['components/popover/popover-trigger.tsx', 'casts a cloned child of unknown tag'],
	['components/tooltip/tooltip-trigger.tsx', 'casts a cloned child of unknown tag'],
])

function scan(pattern: RegExp, allowed?: Map<string, string>): string[] {
	const violations: string[] = []

	for (const dir of SCAN_DIRS) {
		walkSource(join(srcDir, dir), (file, content) => {
			if (!/\.(?:tsx?|mts|cts)$/.test(file)) return

			const rel = relative(srcDir, file)

			if (allowed?.has(rel)) return

			for (const match of content.matchAll(pattern)) {
				violations.push(`${rel} → ${match[1] ?? match[0]}`)
			}
		})
	}

	return violations
}

describe('props base boundary', () => {
	it('no props type is built on a ref-dropping base', () => {
		const violations = scan(BANNED)

		expect(
			violations,
			`use \`ComponentProps<'tag'>\` — it carries \`ref\` (CONVENTIONS §4.3):\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})

	it('no props type is built on element attributes', () => {
		const violations = scan(ELEMENT_ATTRS, ELEMENT_ATTRS_ALLOWED)

		expect(
			violations,
			`use \`ComponentProps<'tag'>\`, or allowlist the multi-element case:\n  ${violations.join('\n  ')}`,
		).toEqual([])
	})
})
