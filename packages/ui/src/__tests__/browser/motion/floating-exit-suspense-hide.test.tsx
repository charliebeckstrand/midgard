import { type ReactNode, Suspense, use, useState } from 'react'
import { describe, expect, it } from 'vitest'
import { userEvent } from 'vitest/browser'
import { Button } from '../../../components/button'
import { Dialog } from '../../../components/dialog'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { renderUI, screen, waitFor } from '../../helpers'

/**
 * A surface that a Suspense boundary hides during its exit comes off the screen
 * at the reveal. The click that closes the surface also mounts a sibling that
 * suspends, so React hides the whole boundary in the same commit as the close.
 * This is the Places user menu, where "Add place" loaded its panel lazily.
 *
 * Real Motion is necessary: the instant mock completes each exit at once, so the
 * hide cannot stop one.
 */
let release: () => void = () => {}

function pending() {
	return new Promise<void>((resolve) => {
		release = resolve
	})
}

function Lazy({ promise }: { promise: Promise<void> }) {
	use(promise)

	return <p>panel</p>
}

function Boundary({ promise, children }: { promise: Promise<void> | null; children: ReactNode }) {
	return (
		<Suspense fallback={<p>loading</p>}>
			{children}
			{promise && <Lazy promise={promise} />}
		</Suspense>
	)
}

function MenuHarness() {
	const [promise, setPromise] = useState<Promise<void> | null>(null)

	return (
		<Boundary promise={promise}>
			<Menu placement="bottom-start">
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>
				<MenuContent>
					<MenuItem onClick={() => setPromise(pending())}>Add</MenuItem>
				</MenuContent>
			</Menu>
		</Boundary>
	)
}

function DialogHarness() {
	const [open, setOpen] = useState(true)

	const [promise, setPromise] = useState<Promise<void> | null>(null)

	return (
		<Boundary promise={promise}>
			<Dialog open={open} onOpenChange={setOpen} aria-label="Panel">
				<Button
					onClick={() => {
						setOpen(false)

						setPromise(pending())
					}}
				>
					Add
				</Button>
			</Dialog>
		</Boundary>
	)
}

async function revealPanel() {
	await waitFor(() => expect(screen.getByText('loading')).toBeInTheDocument())

	release()

	await waitFor(() => expect(screen.getByText('panel')).toBeInTheDocument())
}

describe('floating surface hidden by Suspense during its exit (real Motion)', () => {
	it('removes a menu that closed in the commit that hid it', async () => {
		renderUI(<MenuHarness />)

		await userEvent.click(screen.getByRole('button', { name: 'Open' }))

		await userEvent.click(await waitFor(() => screen.getByRole('menuitem', { name: 'Add' })))

		await revealPanel()

		// Before the fix, the menu came back at full opacity with no pointer events,
		// and it stayed on screen.
		await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())
	})

	it('removes a dialog that closed in the commit that hid it', async () => {
		renderUI(<DialogHarness />)

		await userEvent.click(await waitFor(() => screen.getByRole('button', { name: 'Add' })))

		await revealPanel()

		await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
	})
})
