import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { Listbox } from '../../../components/listbox'
import { ListboxOption } from '../../../components/listbox/listbox-option'
import { ReducedMotionContext } from '../../../primitives/reduced-motion/context'
import { fireEvent, present, renderUI, screen, waitFor } from '../../helpers'
import { centerOf } from '../../helpers/geometry/box'

/**
 * The panels of Listbox and Combobox do not use `FloatingSurface`. Each renders
 * a `PopoverPanel` in its own `Portal`. The `PopoverPanel` is an `m.div`, and an
 * HTML `m` element is `inert` while it exits. Thus a closing panel holds no
 * focus and takes no press.
 *
 * The real engine and real Motion are necessary. The instant Motion mock
 * removes the panel in the commit that closes it, so no exit occurs.
 *
 * The closes go through `fireEvent`, which commits in the same task, so the
 * checks run inside the exit.
 */
const motionCases = [
	{ reduced: false, name: 'the full exit' },
	{ reduced: true, name: 'the reduced exit' },
]

const panelSelector = '[data-slot="popover-panel"]'

const focused = () => present(document.activeElement, 'the focused element')

/** Whether a press at the center of `element` lands on it or inside it. */
function hits(element: Element) {
	const at = centerOf(element)

	return element.contains(document.elementFromPoint(at.x, at.y))
}

/** Asserts that `panel` is still on screen, and that it takes no input. */
function expectExiting(panel: HTMLElement) {
	expect(panel).toBeInTheDocument()

	expect(panel.closest('[inert]')).not.toBeNull()

	expect(panel).not.toContainElement(focused())

	for (const option of panel.querySelectorAll('[role="option"]')) expect(hits(option)).toBe(false)
}

const gone = (panel: HTMLElement) => waitFor(() => expect(panel).not.toBeInTheDocument())

function Motion({ reduced, children }: { reduced: boolean; children: ReactNode }) {
	return <ReducedMotionContext value={reduced}>{children}</ReducedMotionContext>
}

describe('Listbox panel exit (real engine, real Motion)', () => {
	it.each(motionCases)('is inert and holds no focus under $name', async ({ reduced }) => {
		renderUI(
			<Motion reduced={reduced}>
				<Listbox aria-label="Fruit" value="b" displayValue={(v: string) => v}>
					<ListboxOption value="a">Apple</ListboxOption>
					<ListboxOption value="b">Banana</ListboxOption>
					<ListboxOption value="c">Cherry</ListboxOption>
				</Listbox>
			</Motion>,
		)

		await userEvent.click(screen.getByRole('combobox', { name: 'Fruit' }))

		const panel = await waitFor(() =>
			present(document.querySelector<HTMLElement>(panelSelector), 'the panel'),
		)

		await waitFor(() => expect(panel).toContainElement(focused()))

		fireEvent.keyDown(focused(), { key: 'Escape' })

		expectExiting(panel)

		await gone(panel)
	})
})

describe('Combobox panel exit (real engine, real Motion)', () => {
	it.each(motionCases)('is inert under $name', async ({ reduced }) => {
		renderUI(
			<Motion reduced={reduced}>
				<Combobox<string> displayValue={(v) => v} placeholder="Search">
					<ComboboxOption value="apple">
						<ComboboxLabel>Apple</ComboboxLabel>
					</ComboboxOption>
					<ComboboxOption value="apricot">
						<ComboboxLabel>Apricot</ComboboxLabel>
					</ComboboxOption>
				</Combobox>
			</Motion>,
		)

		const input = screen.getByRole('combobox')

		await userEvent.click(input)

		await screen.findByRole('listbox')

		const panel = present(document.querySelector<HTMLElement>(panelSelector), 'the panel')

		fireEvent.keyDown(input, { key: 'Escape' })

		expectExiting(panel)

		await gone(panel)
	})
})
