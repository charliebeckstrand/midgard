import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Dialog, DialogPanel } from '../../../components/dialog'
import { Drawer, DrawerPanel } from '../../../components/drawer'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A Drawer with two steps. A press on the button of the first step shows the
 * second step, and the button of the first step unmounts with the focus on it.
 */
function Steps() {
	const [open, setOpen] = useState(false)

	const [step, setStep] = useState(1)

	return (
		<>
			<Button type="button" onClick={() => setOpen(true)}>
				Open
			</Button>
			<Drawer open={open} onOpenChange={setOpen}>
				<DrawerPanel aria-label="Steps" footer={null}>
					<p>Intro</p>
					{step === 1 ? (
						<Button type="button" onClick={() => setStep(2)}>
							Next
						</Button>
					) : (
						<p>Step two</p>
					)}
					<Button type="button">Other</Button>
				</DrawerPanel>
			</Drawer>
		</>
	)
}

/**
 * A palette that opens a Drawer: a pick closes the palette and opens the Drawer
 * in the same update, as the search of the Elections header does.
 */
function PaletteToDrawer() {
	const [palette, setPalette] = useState(false)

	const [drawer, setDrawer] = useState(false)

	return (
		<>
			<Button type="button" onClick={() => setPalette(true)}>
				Search
			</Button>
			<Dialog open={palette} onOpenChange={setPalette}>
				<DialogPanel aria-label="Palette" footer={null}>
					<Button
						type="button"
						onClick={() => {
							setDrawer(true)

							setPalette(false)
						}}
					>
						Georgia
					</Button>
				</DialogPanel>
			</Dialog>
			<Drawer open={drawer} onOpenChange={setDrawer}>
				<DrawerPanel aria-label="Result" footer={null}>
					<Button type="button">Inside</Button>
				</DrawerPanel>
			</Drawer>
		</>
	)
}

/** Waits until no element with `name` is in the document. */
async function gone(name: string) {
	await waitFor(() => expect(screen.queryByRole('dialog', { name })).toBeNull())
}

/**
 * A modal overlay keeps the focus. The focus never falls to `<body>` while the
 * overlay is open, and it comes back to the page when the overlay closes. The
 * real focus manager is necessary: the jsdom mock moves no focus.
 */
describe('overlay keeps the focus (real focus manager)', () => {
	it('moves the focus into the panel when the focused element unmounts', async () => {
		renderUI(<Steps />)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		const panel = await screen.findByRole('dialog', { name: 'Steps' })

		await userEvent.click(screen.getByRole('button', { name: 'Next' }))

		await screen.findByText('Step two')

		await waitFor(() => expect(document.activeElement).not.toBe(document.body))

		const overlay = panel.closest('[data-slot="overlay"]')

		expect(overlay?.contains(document.activeElement)).toBe(true)
	})

	it('moves the focus in when the element unmounts by a key', async () => {
		renderUI(<Steps />)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		await screen.findByRole('dialog', { name: 'Steps' })

		screen.getByRole('button', { name: 'Next' }).focus()

		await userEvent.keyboard('{Enter}')

		await screen.findByText('Step two')

		await waitFor(() => expect(document.activeElement).not.toBe(document.body))
	})

	it('gives an overlay that opens from a closing overlay the return target of that overlay', async () => {
		renderUI(<PaletteToDrawer />)

		const search = screen.getByRole('button', { name: 'Search' })

		await userEvent.click(search)

		await screen.findByRole('dialog', { name: 'Palette' })

		screen.getByRole('button', { name: 'Georgia' }).focus()

		await userEvent.keyboard('{Enter}')

		await screen.findByRole('dialog', { name: 'Result' })

		await gone('Palette')

		await waitFor(() =>
			expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Inside' })),
		)

		await userEvent.keyboard('{Escape}')

		await gone('Result')

		await waitFor(() => expect(document.activeElement).toBe(search))
	})

	it('returns the focus to the trigger when the Drawer closes before the palette exit ends', async () => {
		renderUI(<PaletteToDrawer />)

		const search = screen.getByRole('button', { name: 'Search' })

		await userEvent.click(search)

		await screen.findByRole('dialog', { name: 'Palette' })

		screen.getByRole('button', { name: 'Georgia' }).focus()

		await userEvent.keyboard('{Enter}')

		await screen.findByRole('dialog', { name: 'Result' })

		await userEvent.keyboard('{Escape}')

		await gone('Result')

		await gone('Palette')

		await waitFor(() => expect(document.activeElement).toBe(search))
	})
})
