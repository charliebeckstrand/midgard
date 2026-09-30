import { describe, expect, it } from 'vitest'
import { baseline, rows } from '../../a11y/cases'
import { renderUI } from '../../helpers'
import {
	clippedText,
	collapsedTargets,
	horizontalPageOverflow,
	overlappingHitAreas,
	overlappingTargets,
} from './helpers/geometry-invariants'

/**
 * Geometry-invariants gate (real browser). Sweeps the baseline corpus with the
 * layout checks axe doesn't run: no visible interactive element collapsed to a
 * zero-size box, no single-line text silently clipped, no in-flow controls
 * overlapping for want of a gap/margin, no two hit areas overlapping at the
 * fine floor of `TouchTarget`, and no page-level horizontal overflow at the
 * default viewport. `hit-area-overlap.test.tsx` checks the hit areas at the
 * coarse floor. Failures print the offending elements' tag,
 * `data-slot`, and text.
 *
 * Runs in the `browser` project (floating-ui mocked, production Tailwind
 * loaded) alongside the axe geometry gate; reusing the corpus keeps every
 * component covered by both the moment it's added to `a11y/cases`.
 *
 * The overlay corpus is deliberately excluded: under this project's mocked
 * floating engine, panel position is the mock's layout, not production
 * geometry, so overlap/overflow assertions would test the mock.
 */
describe('geometry invariants: baseline', () => {
	it.each(rows(baseline))('%s holds the layout invariants', (_name, { element }) => {
		const { container } = renderUI(element)

		expect(collapsedTargets(container)).toEqual([])

		expect(clippedText(container)).toEqual([])

		expect(overlappingTargets(container)).toEqual([])

		expect(overlappingHitAreas(container)).toEqual([])

		expect(horizontalPageOverflow()).toBe(0)
	})
})
