import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import type { Orientation } from '../../types/orientation'
import { renderUI, waitFor } from '../helpers'
import { resizeObserverLoopErrors } from './helpers/resize-observer-loop'

/**
 * A wrapped `Toolbar` hides a separator at the start or the end of a row (V61),
 * and each row starts at the edge of the toolbar. jsdom has no layout, so the
 * rows are a claim for a real browser.
 *
 * Each group holds two 40px buttons (82px with the group gap). A separator
 * takes 9px (1px rule and two 4px margins), and the toolbar gap is 4px. One row
 * needs 280px. At 200px, the first row holds the first two groups and both
 * separators, so the second separator ends the row. At 90px, each row holds one
 * group, and each separator starts a row.
 */
describe('Toolbar separator on a wrapped row (real browser)', () => {
	beforeAll(() => page.viewport(800, 600))

	function Probe({
		width,
		orientation,
		dir,
	}: {
		width: number
		orientation?: Orientation
		dir?: 'ltr' | 'rtl'
	}) {
		return (
			<div style={{ width }} dir={dir}>
				<Toolbar aria-label="Editor" orientation={orientation}>
					{(['a', 'b', 'c'] as const).flatMap((group, index) => [
						...(index > 0 ? [<ToolbarSeparator key={`separator-${group}`} />] : []),
						<ToolbarGroup key={group} aria-label={group}>
							<button type="button" style={{ width: 40, height: 32 }}>
								{group}1
							</button>
							<button type="button" style={{ width: 40, height: 32 }}>
								{group}2
							</button>
						</ToolbarGroup>,
					])}
				</Toolbar>
			</div>
		)
	}

	/** The visibility of each separator, in document order. */
	function visibility(container: HTMLElement): string[] {
		return Array.from(container.querySelectorAll('[data-slot="toolbar-separator"]')).map(
			(separator) => getComputedStyle(separator).visibility,
		)
	}

	/** The top of each group, rounded, in document order. */
	function groupTops(container: HTMLElement): number[] {
		return Array.from(container.querySelectorAll('[data-slot="toolbar-group"]')).map((group) =>
			Math.round(group.getBoundingClientRect().top),
		)
	}

	it('hides a separator that ends a row, shows the rest, and shows it again on one row', async () => {
		const { container, rerender } = renderUI(<Probe width={200} />)

		const [a, b, c] = groupTops(container)

		// The precondition: the wrap falls right after the second separator.
		expect(a).toBe(b)

		expect(c).toBeGreaterThan(a ?? 0)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'hidden']))

		rerender(<Probe width={400} />)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'visible']))

		expect(new Set(groupTops(container)).size).toBe(1)
	})

	/** The inline-start offset of each group from the toolbar, rounded, in document order. */
	function groupStarts(container: HTMLElement, dir: 'ltr' | 'rtl' = 'ltr'): number[] {
		const toolbar = container.querySelector('[role="toolbar"]')?.getBoundingClientRect()

		return Array.from(container.querySelectorAll('[data-slot="toolbar-group"]')).map((group) => {
			const box = group.getBoundingClientRect()

			return Math.round(
				dir === 'rtl' ? (toolbar?.right ?? 0) - box.right : box.left - (toolbar?.left ?? 0),
			)
		})
	}

	it('hides a separator that starts a row', async () => {
		// 90px holds one group, but not the group and the separator after it.
		const { container } = renderUI(<Probe width={90} />)

		await waitFor(() => expect(visibility(container)).toEqual(['hidden', 'hidden']))
	})

	it.each(['ltr', 'rtl'] as const)(
		'starts a row at the edge after a separator that starts it (%s)',
		async (dir) => {
			// 185px holds the first two groups and the separator between them, but not
			// the second separator. That separator starts the second row, before the
			// last group.
			const { container } = renderUI(<Probe width={185} dir={dir} />)

			await waitFor(() => expect(visibility(container)).toEqual(['visible', 'hidden']))

			const [a, b, c] = groupTops(container)

			expect(a).toBe(b)

			expect(c).toBeGreaterThan(a ?? 0)

			expect(groupStarts(container, dir)[2]).toBe(0)
		},
	)

	it('keeps a separator that starts a row on the row of the next group', async () => {
		// At 90px, each separator starts a row. The group after it moves back over
		// its box, so it fits on the row of the separator, and no row holds only a
		// hidden separator.
		const { container } = renderUI(<Probe width={90} />)

		await waitFor(() => expect(visibility(container)).toEqual(['hidden', 'hidden']))

		const toolbar = container.querySelector('[role="toolbar"]')

		const tops = Array.from(toolbar?.children ?? []).map((child) =>
			Math.round(child.getBoundingClientRect().top),
		)

		expect(new Set(tops).size).toBe(3)

		expect(groupStarts(container)).toEqual([0, 0, 0])
	})

	it('starts a row at the edge after a separator that ends the row above', async () => {
		const { container } = renderUI(<Probe width={200} />)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'hidden']))

		expect(groupStarts(container)[2]).toBe(0)
	})

	/** Waits for `count` animation frames. */
	async function frames(count: number) {
		for (let index = 0; index < count; index++)
			await new Promise((resolve) => requestAnimationFrame(resolve))
	}

	it('marks the rows again on a resize that changes them, with no ResizeObserver loop error', async () => {
		const errors = resizeObserverLoopErrors()

		const { container, rerender } = renderUI(<Probe width={200} />)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'hidden']))

		// The observer attaches in an effect after the paint, so the resize comes
		// after its first delivery.
		await frames(2)

		// At 90px, the marks take the toolbar from five rows to three, so the
		// marks change the height of the toolbar that the observer watches.
		rerender(<Probe width={90} />)

		await waitFor(() => expect(groupStarts(container)).toEqual([0, 0, 0]))

		rerender(<Probe width={200} />)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'hidden']))

		// Two more frames, so that each held notification has its frame.
		await frames(2)

		expect(errors).toEqual([])
	})

	it('keeps the rows when it hides a separator', async () => {
		const { container } = renderUI(<Probe width={200} />)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'hidden']))

		const separator = container.querySelectorAll('[data-slot="toolbar-separator"]')[1]

		expect(separator?.getBoundingClientRect().width).toBeGreaterThan(0)

		const [a, b, c] = groupTops(container)

		expect(a).toBe(b)

		expect(c).toBeGreaterThan(a ?? 0)
	})

	it('shows each separator in a vertical toolbar', async () => {
		const { container } = renderUI(<Probe width={90} orientation="vertical" />)

		await waitFor(() => expect(visibility(container)).toEqual(['visible', 'visible']))

		expect(container.querySelector('[data-row-edge]')).toBeNull()
	})
})
