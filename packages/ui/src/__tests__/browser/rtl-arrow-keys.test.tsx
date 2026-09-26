import { afterEach, describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Calendar } from '../../components/calendar'
import { Tab, TabList, Tabs } from '../../components/tabs'
import { Tree, TreeItem } from '../../components/tree'
import { renderUI, screen } from '../helpers'

/**
 * A horizontal arrow steps through the reading order, so it swaps in a right-to-left layout.
 *
 * Only the grid read the direction before. Tabs, a tree branch, and a calendar day grid kept
 * `ArrowRight` as "next" in RTL, so the key moved away from the item it pointed at. The rule now
 * lives in `hooks/a11y/logical-arrow.ts`, and `useA11yRoving` applies it. Tabs and the calendar
 * reach it through the roving hook, and the tree calls it directly.
 *
 * Rides the real browser because the rule reads the computed `direction`, which jsdom does not
 * resolve from a `dir` attribute.
 */
describe('horizontal arrow keys in RTL (real browser)', () => {
	afterEach(() => {
		document.documentElement.removeAttribute('dir')
	})

	for (const dir of ['ltr', 'rtl'] as const) {
		/** The physical key that steps forward in the reading order. */
		const forward = dir === 'ltr' ? '{ArrowRight}' : '{ArrowLeft}'

		const back = dir === 'ltr' ? '{ArrowLeft}' : '{ArrowRight}'

		describe(dir, () => {
			it('moves to the next tab with the forward arrow', async () => {
				document.documentElement.dir = dir

				renderUI(
					<Tabs value="a" onValueChange={() => {}}>
						<TabList aria-label="Sections">
							<Tab value="a">A</Tab>
							<Tab value="b">B</Tab>
							<Tab value="c">C</Tab>
						</TabList>
					</Tabs>,
				)

				// Three tabs, because the row wraps: with two, either arrow would reach
				// the other tab.
				const [a, b] = screen.getAllByRole('tab')

				a?.focus()

				await userEvent.keyboard(forward)

				expect(document.activeElement).toBe(b)

				await userEvent.keyboard(back)

				expect(document.activeElement).toBe(a)
			})

			it('opens a tree branch with the forward arrow and closes it with the back arrow', async () => {
				document.documentElement.dir = dir

				renderUI(
					<Tree aria-label="Files">
						<TreeItem label="src">
							<TreeItem label="a.ts" />
						</TreeItem>
					</Tree>,
				)

				const branch = screen.getByRole('treeitem', { name: /src/ })

				branch.focus()

				await userEvent.keyboard(forward)

				expect(branch).toHaveAttribute('aria-expanded', 'true')

				await userEvent.keyboard(back)

				expect(branch).toHaveAttribute('aria-expanded', 'false')
			})

			it('steps to the next day with the forward arrow', async () => {
				document.documentElement.dir = dir

				renderUI(<Calendar defaultValue={new Date(2025, 5, 15)} />)

				const day = (n: string) =>
					screen.getAllByRole('option').find((option) => option.textContent === n) as HTMLElement

				day('10').focus()

				await userEvent.keyboard(forward)

				expect(document.activeElement).toBe(day('11'))

				await userEvent.keyboard(back)

				expect(document.activeElement).toBe(day('10'))
			})
		})
	}
})
