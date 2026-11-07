import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Confirm } from '../../../components/confirm'
import { Overlay } from '../../../primitives/overlay'
import { fireEvent, noop, renderUI, screen, waitFor } from '../../helpers'

/**
 * A modal overlay seals the page only while it is open. A closed overlay stays
 * on screen for its exit, and it is `inert` for that time. If the page stays
 * `aria-hidden` too, assistive technology finds no content until the exit
 * completes. The focus goes to `<body>` at the close and back to the trigger
 * at unmount, so a fast second Enter does not press the trigger.
 *
 * The real engine and real Motion are necessary. The mocked engine has no
 * focus manager, so nothing marks the page. The instant Motion mock removes
 * the overlay in the commit that closes it, so no exit occurs.
 *
 * The close goes through `fireEvent`, which commits in the same task, so the
 * checks run inside the exit.
 */
const root = () => document.querySelector('[data-slot="overlay"]')

const gone = () => waitFor(() => expect(root()).toBeNull())

/** The page by its text: a sealed page has no accessible name. */
const trigger = () => screen.getByText('Open').closest('button') as HTMLElement

const sealed = (element: Element) => element.closest('[aria-hidden="true"], [inert]') !== null

function App() {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Open</Button>
			<Overlay open={open} onOpenChange={setOpen}>
				<div>
					<Button onClick={() => setOpen(false)}>Close</Button>
				</div>
			</Overlay>
		</>
	)
}

/** An app Confirm: the handler runs the action and closes the dialog. */
function DeleteApp({ onOpen, onDelete }: { onOpen: () => void; onDelete: () => void }) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button
				onClick={() => {
					onOpen()

					setOpen(true)
				}}
			>
				Delete
			</Button>
			<Confirm
				open={open}
				onOpenChange={setOpen}
				title="Delete the item?"
				confirm={{ label: 'Delete it' }}
				onConfirm={() => {
					onDelete()

					setOpen(false)
				}}
			/>
		</>
	)
}

describe('Overlay exit seal (real engine, real Motion)', () => {
	it('gives the page back to assistive technology at the close, not at unmount', async () => {
		renderUI(<App />)

		await userEvent.click(trigger())

		const close = await waitFor(() => screen.getByRole('button', { name: 'Close' }))

		await waitFor(() => expect(sealed(trigger())).toBe(true))

		fireEvent.click(close)

		// The overlay is in its exit, and only the overlay is sealed.
		expect(root()).not.toBeNull()

		expect(root()).toHaveAttribute('inert')

		expect(sealed(trigger())).toBe(false)

		expect(document.activeElement).toBe(document.body)

		await gone()

		expect(trigger()).toHaveFocus()
	})

	it('seals the page again for a reopen during the exit', async () => {
		const overlay = (open: boolean) => (
			<>
				<button type="button">page</button>
				<Overlay open={open} onOpenChange={noop}>
					<button type="button">inside</button>
				</Overlay>
			</>
		)

		const { rerender } = renderUI(overlay(true))

		const page = screen.getByText('page')

		await waitFor(() => expect(sealed(page)).toBe(true))

		rerender(overlay(false))

		expect(sealed(page)).toBe(false)

		rerender(overlay(true))

		await waitFor(() => expect(sealed(page)).toBe(true))
	})

	it('does not open the Confirm again for two quick Enter presses on the confirm button', async () => {
		const onOpen = vi.fn()

		const onDelete = vi.fn()

		renderUI(<DeleteApp onOpen={onOpen} onDelete={onDelete} />)

		await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

		const confirm = await waitFor(() => screen.getByRole('button', { name: 'Delete it' }))

		confirm.focus()

		await userEvent.keyboard('{Enter}{Enter}')

		await gone()

		expect(onDelete).toHaveBeenCalledOnce()

		expect(onOpen).toHaveBeenCalledOnce()

		expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus()
	})
})
