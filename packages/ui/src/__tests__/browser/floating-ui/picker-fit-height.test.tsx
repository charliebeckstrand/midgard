import { beforeAll, describe, expect, it } from 'vitest'
import { page, userEvent } from 'vitest/browser'
import { ColorPicker } from '../../../components/color'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { DatePicker } from '../../../components/date-picker'
import { Listbox } from '../../../components/listbox'
import { ListboxOption } from '../../../components/listbox/listbox-option'
import { frames, getSlot, renderUI, screen, waitFor } from '../../helpers'

const values = Array.from({ length: 30 }, (_, index) => `Item ${index + 1}`)

/**
 * In a short viewport, such as a landscape phone, the panel of each picker stays
 * on screen. A panel taller than the space on its side shrinks, as Menu does.
 */
describe('a picker panel in a short viewport (real floating engine)', () => {
	beforeAll(() => page.viewport(740, 360))

	async function settle() {
		await frames()

		await frames()
	}

	/** The box of the element that the scroll ancestors leave visible. */
	function expectOnScreen(element: Element) {
		let { top, bottom } = element.getBoundingClientRect()

		for (
			let node = element.parentElement;
			node && node !== document.body;
			node = node.parentElement
		) {
			if (getComputedStyle(node).overflowY === 'visible') continue

			const rect = node.getBoundingClientRect()

			top = Math.max(top, rect.top)

			bottom = Math.min(bottom, rect.bottom)
		}

		expect(top).toBeGreaterThanOrEqual(0)

		expect(bottom).toBeLessThanOrEqual(window.innerHeight)
	}

	/**
	 * Scrolls each scroll region in the panel to its end, then checks that the
	 * last element of the panel is on screen. Thus all the content stays reachable.
	 */
	async function expectEndReachable(panel: Element) {
		const scrollers = [panel, ...panel.querySelectorAll('*')].filter(
			(node) =>
				node.scrollHeight > node.clientHeight && getComputedStyle(node).overflowY !== 'visible',
		)

		expect(scrollers.length).toBeGreaterThan(0)

		for (const node of scrollers) node.scrollTop = node.scrollHeight

		await frames()

		const all = panel.querySelectorAll('*')

		expectOnScreen(all[all.length - 1] ?? panel)
	}

	function Centered({ children }: { children: React.ReactNode }) {
		return <div style={{ paddingTop: 150, paddingLeft: 200, width: 300 }}>{children}</div>
	}

	it('keeps a Listbox panel on screen', async () => {
		renderUI(
			<Centered>
				<Listbox aria-label="pick">
					{values.map((v) => (
						<ListboxOption key={v} value={v}>
							{v}
						</ListboxOption>
					))}
				</Listbox>
			</Centered>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'pick' }))

		const panel = await screen.findByRole('listbox')

		await settle()

		expectOnScreen(panel)

		await expectEndReachable(panel)
	})

	it('keeps a Combobox panel on screen', async () => {
		renderUI(
			<Centered>
				<Combobox<string> displayValue={(v) => v} placeholder="Search">
					{values.map((v) => (
						<ComboboxOption key={v} value={v}>
							<ComboboxLabel>{v}</ComboboxLabel>
						</ComboboxOption>
					))}
				</Combobox>
			</Centered>,
		)

		await userEvent.click(screen.getByRole('combobox'))

		const listbox = await screen.findByRole('listbox')

		await settle()

		expectOnScreen(listbox)

		await expectEndReachable(getSlot(document.body, 'popover-panel'))
	})

	it('keeps a DatePicker panel on screen', async () => {
		renderUI(
			<Centered>
				<DatePicker aria-label="Due date" />
			</Centered>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'Due date' }))

		await screen.findByRole('dialog')

		const panel = getSlot(document.body, 'datepicker-content')

		await settle()

		expectOnScreen(panel)

		await expectEndReachable(panel)
	})

	it('keeps a ColorPicker panel on screen', async () => {
		const { container } = renderUI(
			<Centered>
				<ColorPicker defaultValue="#3b82f6" />
			</Centered>,
		)

		await userEvent.click(getSlot(container, 'color-picker-button'))

		const panel = await waitFor(() => getSlot(document.body, 'color-picker-content'))

		await settle()

		expectOnScreen(panel)

		await expectEndReachable(panel)
	})
})
