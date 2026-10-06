import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { CommandPalette, CommandPaletteItem } from '../../../components/command-palette'
import { Confirm } from '../../../components/confirm'
import { Overlay } from '../../../primitives/overlay'
import { present, renderUI, screen, waitFor } from '../../helpers'

/**
 * A closed overlay stays on screen for its 150 ms exit, and `AnimatePresence`
 * keeps the subtree of the last open render. Overlay makes the root `inert` for
 * the exit and moves the focus out. Thus a second press or a second Enter in
 * that time does not run a handler again.
 *
 * Real Motion is necessary: the instant mock removes the node in the commit
 * that closes it, so no exit occurs.
 */
const root = () =>
	present(document.querySelector<HTMLElement>('[data-slot="overlay"]'), '[data-slot="overlay"]')

const gone = () => waitFor(() => expect(document.querySelector('[data-slot="overlay"]')).toBeNull())

/** An app Confirm: the handler runs the action and closes the dialog. */
function DeleteApp({ onDelete }: { onDelete: () => void }) {
	const [open, setOpen] = useState(false)

	return (
		<>
			<Button onClick={() => setOpen(true)}>Delete</Button>
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

function PaletteApp({ onRun }: { onRun: () => void }) {
	const [open, setOpen] = useState(true)

	return (
		<CommandPalette open={open} onOpenChange={setOpen}>
			<CommandPaletteItem onAction={onRun}>Run</CommandPaletteItem>
		</CommandPalette>
	)
}

async function openConfirm() {
	await userEvent.click(screen.getByRole('button', { name: 'Delete' }))

	return waitFor(() => screen.getByRole('button', { name: 'Delete it' }))
}

describe('Overlay exit guard (real Motion)', () => {
	it('makes the root inert for the exit and live again on a reopen', () => {
		const overlay = (open: boolean) => (
			<Overlay open={open} onOpenChange={() => {}}>
				<button type="button">inside</button>
			</Overlay>
		)

		const { rerender } = renderUI(overlay(true))

		const node = root()

		expect(node).not.toHaveAttribute('inert')

		rerender(overlay(false))

		// The node stays for the exit, and it takes no input.
		expect(root()).toBe(node)

		expect(node).toHaveAttribute('inert')

		rerender(overlay(true))

		// A reopen during the exit keeps the same node, so the guard must go.
		expect(root()).toBe(node)

		expect(node).not.toHaveAttribute('inert')
	})

	it('runs onConfirm once for a double click on the confirm button', async () => {
		const onDelete = vi.fn()

		renderUI(<DeleteApp onDelete={onDelete} />)

		await userEvent.dblClick(await openConfirm())

		await gone()

		expect(onDelete).toHaveBeenCalledOnce()
	})

	it('runs onConfirm once for two quick Enter presses on the confirm button', async () => {
		const onDelete = vi.fn()

		renderUI(<DeleteApp onDelete={onDelete} />)

		const confirm = await openConfirm()

		confirm.focus()

		await userEvent.keyboard('{Enter}{Enter}')

		await gone()

		expect(onDelete).toHaveBeenCalledOnce()
	})

	it('runs onAction once for a double click on a palette item', async () => {
		const onRun = vi.fn()

		renderUI(<PaletteApp onRun={onRun} />)

		await userEvent.dblClick(await waitFor(() => screen.getByRole('option', { name: 'Run' })))

		await gone()

		expect(onRun).toHaveBeenCalledOnce()
	})
})
