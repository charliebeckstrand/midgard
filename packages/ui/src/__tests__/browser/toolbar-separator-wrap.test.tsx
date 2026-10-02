import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import type { ToolbarOrientation } from '../../components/toolbar/types'
import { renderUI, waitFor } from '../helpers'

/**
 * A wrapped `Toolbar` hides a separator at the start or the end of a row (V61).
 * jsdom has no layout, so the rows are a claim for a real browser.
 *
 * Each group holds two 40px buttons (82px with the group gap). A separator
 * takes 9px (1px rule and two 4px margins), and the toolbar gap is 4px. One row
 * needs 280px. At 200px, the first row holds the first two groups and both
 * separators, so the second separator ends the row.
 */
describe('Toolbar separator on a wrapped row (real browser)', () => {
	beforeAll(() => page.viewport(800, 600))

	function Probe({ width, orientation }: { width: number; orientation?: ToolbarOrientation }) {
		return (
			<div style={{ width }}>
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
			(el) => getComputedStyle(el).visibility,
		)
	}

	/** The top of each group, rounded, in document order. */
	function groupTops(container: HTMLElement): number[] {
		return Array.from(container.querySelectorAll('[data-slot="toolbar-group"]')).map((el) =>
			Math.round(el.getBoundingClientRect().top),
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

	it('hides a separator that starts a row', async () => {
		// 90px holds one group, but not the group and the separator after it.
		const { container } = renderUI(<Probe width={90} />)

		await waitFor(() => expect(visibility(container)).toEqual(['hidden', 'hidden']))
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
