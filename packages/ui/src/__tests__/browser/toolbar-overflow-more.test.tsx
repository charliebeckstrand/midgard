import { Square } from 'lucide-react'
import { renderToString } from 'react-dom/server'
import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { ButtonIconTooltip } from '../../components/button/button-icon-tooltip'
import { Toolbar, ToolbarGroup, ToolbarSeparator } from '../../components/toolbar'
import { Glyph } from '../../primitives/glyph'
import { act, renderUI, screen, waitFor, within } from '../helpers'
import { resizeObserverLoopErrors } from './helpers/resize-observer-loop'

/**
 * A `Toolbar` with `overflow="more"` is one row. The groups that the row cannot
 * hold wait behind More, and a press on More shows them on the next page,
 * after Back. CSS fits the row, so the server markup paints the fit. jsdom has
 * no layout, so the fit is a claim for a real browser.
 *
 * Each group holds two 40 px buttons, 32 px tall. With the gaps, the
 * separators, and the room for More, three groups need about 300 px on one
 * row. At 240 px, the row holds the first two groups, and the third waits
 * behind More. At 120 px, each page holds one group.
 */
describe('Toolbar with More (real browser)', () => {
	beforeAll(() => page.viewport(800, 600))

	function Probe({ width, dir }: { width: number; dir?: 'ltr' | 'rtl' }) {
		return (
			<div style={{ width }} dir={dir}>
				<Toolbar aria-label="Editor" overflow="more">
					{(['a', 'b', 'c'] as const).flatMap((group, index) => [
						...(index > 0 ? [<ToolbarSeparator key={`separator-${group}`} />] : []),
						<ToolbarGroup key={group} aria-label={group}>
							{[1, 2].map((index) => (
								<ButtonIconTooltip
									key={index}
									variant="bare"
									label={`${group}${index}`}
									icon={<Glyph icon={Square} />}
									disabled={false}
								/>
							))}
						</ToolbarGroup>,
					])}
				</Toolbar>
			</div>
		)
	}

	function getToolbar(container: HTMLElement): HTMLElement {
		const toolbar = container.querySelector<HTMLElement>('[role="toolbar"]')

		if (!toolbar) throw new Error('No toolbar')

		return toolbar
	}

	function getMore(container: HTMLElement): HTMLElement {
		const more = container.querySelector<HTMLElement>('[data-slot="toolbar-more"] > button')

		if (!more) throw new Error('No More button')

		return more
	}

	/** The height of one row: the height of a button. */
	function rowHeight(container: HTMLElement): number {
		return container.querySelector('button')?.getBoundingClientRect().height ?? Number.NaN
	}

	/**
	 * Whether `element` starts on the row, and not in the clip above or below
	 * it. The checks read a button and not its group, and the top and not the
	 * bottom: the test double of the portal draws an open tooltip in the group,
	 * which makes the group taller.
	 */
	function onRow(toolbar: HTMLElement, element: Element): boolean {
		const row = toolbar.getBoundingClientRect()

		const box = element.getBoundingClientRect()

		return box.top >= row.top - 0.5 && box.top < row.bottom - 0.5
	}

	it('shows each group and no More when the row holds them', async () => {
		const { container } = renderUI(<Probe width={300} />)

		const toolbar = getToolbar(container)

		expect(toolbar.getBoundingClientRect().height).toBe(rowHeight(container))

		expect(onRow(toolbar, getMore(container))).toBe(false)

		await waitFor(() =>
			expect(container.querySelector('[data-slot="toolbar-more"]')).toHaveAttribute('inert'),
		)

		for (const name of ['a', 'b', 'c']) {
			const group = screen.getByRole('group', { name })

			expect(onRow(toolbar, group)).toBe(true)

			expect(group).not.toHaveAttribute('inert')
		}
	})

	it.each(['ltr', 'rtl'] as const)(
		'keeps one row and shows More at the end when the row is short (%s)',
		async (dir) => {
			const errors = resizeObserverLoopErrors()

			const { container } = renderUI(<Probe width={180} dir={dir} />)

			const toolbar = getToolbar(container)

			const more = getMore(container)

			expect(toolbar.getBoundingClientRect().height).toBe(rowHeight(container))

			expect(onRow(toolbar, more)).toBe(true)

			const row = toolbar.getBoundingClientRect()

			const end = more.getBoundingClientRect()

			expect(Math.round(dir === 'rtl' ? end.left - row.left : row.right - end.right)).toBe(0)

			// The third group waits below the clip, out of the arrow order and the tree.
			const c = screen.getByRole('group', { name: 'c', hidden: true })

			expect(onRow(toolbar, c)).toBe(false)

			await waitFor(() => expect(c).toHaveAttribute('inert'))

			expect(more.closest('[inert]')).toBeNull()

			expect(errors).toEqual([])
		},
	)

	it('paints the fit from the server markup, before any script runs', () => {
		const host = document.createElement('div')

		document.body.append(host)

		host.innerHTML = renderToString(<Probe width={180} />)

		const toolbar = getToolbar(host)

		expect(toolbar.getBoundingClientRect().height).toBe(rowHeight(host))

		expect(onRow(toolbar, getMore(host))).toBe(true)

		expect(onRow(toolbar, host.querySelector('[aria-label="c"]') as Element)).toBe(false)

		host.innerHTML = renderToString(<Probe width={300} />)

		expect(onRow(getToolbar(host), getMore(host))).toBe(false)

		host.remove()
	})

	it('shows the next page on More, and the first page on Back, at one height', async () => {
		const { container } = renderUI(<Probe width={180} />)

		const toolbar = getToolbar(container)

		await userEvent.click(getMore(container))

		const back = await screen.findByRole('button', { name: 'Back' })

		expect(onRow(toolbar, back)).toBe(true)

		expect(onRow(toolbar, screen.getByRole('button', { name: 'c1' }))).toBe(true)

		expect(screen.queryByRole('group', { name: 'a' })).toBeNull()

		expect(toolbar.getBoundingClientRect().height).toBe(rowHeight(container))

		// The last page has no More.
		await waitFor(() =>
			expect(container.querySelector('[data-slot="toolbar-more"]')).toHaveAttribute('inert'),
		)

		await userEvent.click(back)

		await waitFor(() => expect(screen.queryByRole('button', { name: 'Back' })).toBeNull())

		expect(onRow(toolbar, screen.getByRole('button', { name: 'a1' }))).toBe(true)

		expect(onRow(toolbar, getMore(container))).toBe(true)
	})

	it('pages again when the next page does not fit, and Back goes one page back', async () => {
		const { container } = renderUI(<Probe width={140} />)

		const toolbar = getToolbar(container)

		// A click with no pointer: the test double of the portal draws a hover
		// tooltip in its group, and the wider group would wrap.

		act(() => getMore(container).click())

		await waitFor(() =>
			expect(onRow(toolbar, screen.getByRole('button', { name: 'b1' }))).toBe(true),
		)

		expect(onRow(toolbar, getMore(container))).toBe(true)

		act(() => getMore(container).click())

		await waitFor(() =>
			expect(onRow(toolbar, screen.getByRole('button', { name: 'c1' }))).toBe(true),
		)

		expect(screen.queryByRole('group', { name: 'b' })).toBeNull()

		expect(toolbar.getBoundingClientRect().height).toBe(rowHeight(container))

		// Back goes one page back each time, and not to the first page.
		const back = () => screen.getByRole('button', { name: 'Back' })

		act(() => back().click())

		await waitFor(() =>
			expect(onRow(toolbar, screen.getByRole('button', { name: 'b1' }))).toBe(true),
		)

		expect(screen.queryByRole('group', { name: 'a' })).toBeNull()

		act(() => back().click())

		await waitFor(() =>
			expect(onRow(toolbar, screen.getByRole('button', { name: 'a1' }))).toBe(true),
		)

		expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
	})

	it('moves the focus with the page when the focus is in the toolbar', async () => {
		const { container } = renderUI(<Probe width={180} />)

		const toolbar = getToolbar(container)

		within(toolbar).getByRole('button', { name: 'a1' }).focus()

		// The arrow order skips the third group, which waits below the clip.
		await userEvent.keyboard('{End}')

		expect(getMore(container)).toHaveFocus()

		await userEvent.keyboard('{Enter}')

		await waitFor(() => expect(within(toolbar).getByRole('button', { name: 'c1' })).toHaveFocus())

		await userEvent.keyboard('{Home}')

		expect(screen.getByRole('button', { name: 'Back' })).toHaveFocus()

		await userEvent.keyboard('{ArrowRight}{Escape}')

		await waitFor(() => expect(getMore(container)).toHaveFocus())

		expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
	})
})
