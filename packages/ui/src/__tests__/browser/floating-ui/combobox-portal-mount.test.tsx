import { Activity, StrictMode } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Combobox, ComboboxLabel, ComboboxOption } from '../../../components/combobox'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * The Combobox panel mounts its portal node only while the panel is open.
 *
 * Here because the jsdom projects and the default browser project mock
 * `@floating-ui/react`, and that mock renders `FloatingPortal` inline. Thus the
 * portal node does not exist there. The real engine builds the node in a layout
 * effect, and `patches/@floating-ui__react` keeps it across an `<Activity>` hide.
 *
 * A closed Combobox must keep no `[data-floating-ui-portal]` node in `<body>`.
 * A page of closed comboboxes otherwise adds one empty node for each control.
 *
 * This project mocks `motion/react`, and the mock `AnimatePresence` never
 * completes an exit. Thus a close here keeps the node until a reveal of an
 * `<Activity>` completes the stopped exit, as `Portal` documents.
 *
 * The options mount with the portal, after the open commits. The cases that
 * seat or re-anchor the highlight make sure that the effects which read the
 * options at the open still find them.
 */
const portalNodes = () => document.body.querySelectorAll('[data-floating-ui-portal]').length

function Fruit() {
	return (
		<Combobox<string> displayValue={(v) => v} placeholder="Search">
			<ComboboxOption value="apple">
				<ComboboxLabel>Apple</ComboboxLabel>
			</ComboboxOption>
			<ComboboxOption value="apricot">
				<ComboboxLabel>Apricot</ComboboxLabel>
			</ComboboxOption>
		</Combobox>
	)
}

function Parked({ hidden }: { hidden: boolean }) {
	return (
		<Activity mode={hidden ? 'hidden' : 'visible'}>
			<Fruit />
		</Activity>
	)
}

async function openAndClose() {
	await userEvent.click(screen.getByRole('combobox'))

	await waitFor(() => expect(screen.getByRole('listbox')).toBeInTheDocument())

	expect(portalNodes()).toBe(1)

	await userEvent.keyboard('{Escape}')

	await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())
}

describe('Combobox portal node (real browser)', () => {
	it('mounts no portal node for closed comboboxes', () => {
		renderUI(
			<>
				<Fruit />
				<Fruit />
				<Fruit />
			</>,
		)

		expect(portalNodes()).toBe(0)
	})

	it('keeps no portal node after an unmount under StrictMode', async () => {
		const { unmount } = renderUI(
			<StrictMode>
				<Fruit />
			</StrictMode>,
		)

		await openAndClose()

		unmount()

		expect(portalNodes()).toBe(0)
	})

	it('mounts no portal node at the reveal of a closed combobox', () => {
		const { rerender } = renderUI(<Parked hidden={false} />)

		rerender(<Parked hidden />)

		rerender(<Parked hidden={false} />)

		expect(portalNodes()).toBe(0)
	})

	it('removes the portal node at the reveal after a close', async () => {
		const { rerender } = renderUI(<Parked hidden={false} />)

		await openAndClose()

		rerender(<Parked hidden />)

		rerender(<Parked hidden={false} />)

		await waitFor(() => expect(portalNodes()).toBe(0))
	})

	it('seats the highlight on the selected option when ArrowDown reopens the menu', async () => {
		renderUI(<Fruit />)

		const input = screen.getByRole('combobox')

		await userEvent.click(input)

		await userEvent.click(await screen.findByRole('option', { name: 'Apricot' }))

		await waitFor(() => expect(screen.queryByRole('listbox')).toBeNull())

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => {
			const activeId = input.getAttribute('aria-activedescendant')

			expect(document.getElementById(activeId ?? '')).toBe(
				screen.getByRole('option', { name: 'Apricot' }),
			)
		})
	})

	it('re-anchors the highlight when the options swap on the first open', async () => {
		const tree = (value: string) => (
			<Combobox<string> displayValue={(v) => v} placeholder="Search">
				<ComboboxOption key={value} value={value}>
					<ComboboxLabel>{value}</ComboboxLabel>
				</ComboboxOption>
			</Combobox>
		)

		const { rerender } = renderUI(tree('apple'))

		const input = screen.getByRole('combobox')

		await userEvent.click(input)

		await screen.findByRole('listbox')

		await userEvent.keyboard('{ArrowDown}')

		await waitFor(() => expect(input).toHaveAttribute('aria-activedescendant'))

		rerender(tree('apricot'))

		await waitFor(() => {
			const active = document.getElementById(input.getAttribute('aria-activedescendant') ?? '')

			expect(active).toBe(screen.getByRole('option', { name: /apricot/i }))
		})
	})
})
