import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Dialog, DialogPanel, DialogTitle } from '../../../components/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Sheet, SheetPanel } from '../../../components/sheet'
import { fireEvent, renderUI, screen, waitFor } from '../../helpers'

/**
 * A non-modal Sheet closes on a press outside it. A Dialog that opens from the
 * Sheet portals out of the DOM of the Sheet, and it unmounts with the Sheet. A
 * press in the Dialog, or in a surface that opens from the Dialog, must thus
 * not close the Sheet. A press on the page still closes it.
 *
 * Each overlay opens after the mount. An overlay that is open at the mount
 * renders in place until the hydration, in the DOM of its parent.
 *
 * The jsdom suite mocks `@floating-ui/react` away, so only this project can
 * assert it.
 */
function NestedOverlays({ onSheetChange }: { onSheetChange: (open: boolean) => void }) {
	const [sheetOpen, setSheetOpen] = useState(false)

	const [dialogOpen, setDialogOpen] = useState(false)

	return (
		<>
			<p data-testid="page">Page</p>
			<button type="button" onClick={() => setSheetOpen(true)}>
				Open sheet
			</button>
			<Sheet
				open={sheetOpen}
				onOpenChange={(open) => {
					onSheetChange(open)

					setSheetOpen(open)
				}}
			>
				<SheetPanel side="start" modal={false} footer={null} aria-label="Navigation">
					<button type="button" onClick={() => setDialogOpen(true)}>
						Open dialog
					</button>
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogPanel>
							<DialogTitle>Settings</DialogTitle>
							<p data-testid="dialog-body">Dialog</p>
							<Popover>
								<PopoverTrigger>
									<button type="button">Open picker</button>
								</PopoverTrigger>
								<PopoverContent aria-label="Picker">
									<p data-testid="picker-body">Picker</p>
								</PopoverContent>
							</Popover>
						</DialogPanel>
					</Dialog>
				</SheetPanel>
			</Sheet>
		</>
	)
}

/** Presses `element` near its top-left corner. */
function press(element: HTMLElement) {
	const rect = element.getBoundingClientRect()

	fireEvent.pointerDown(element, { clientX: rect.left + 4, clientY: rect.top + 4, bubbles: true })
}

/** Renders the overlays, and opens the Sheet and then the Dialog. */
async function openDialog() {
	const onSheetChange = vi.fn()

	renderUI(<NestedOverlays onSheetChange={onSheetChange} />)

	fireEvent.click(screen.getByRole('button', { name: 'Open sheet' }))

	fireEvent.click(await screen.findByRole('button', { name: 'Open dialog' }))

	await screen.findByTestId('dialog-body')

	return onSheetChange
}

describe('a Dialog that opens from a non-modal Sheet (real browser)', () => {
	it('keeps the Sheet open on a press in the Dialog', async () => {
		const onSheetChange = await openDialog()

		press(screen.getByTestId('dialog-body'))

		// The exit animation keeps a closed Sheet in the DOM, so the check reads the
		// close request.
		expect(onSheetChange).not.toHaveBeenCalled()
	})

	it('keeps the Sheet open on a press in a surface that opens from the Dialog', async () => {
		const onSheetChange = await openDialog()

		fireEvent.click(screen.getByRole('button', { name: 'Open picker' }))

		press(await screen.findByTestId('picker-body'))

		expect(onSheetChange).not.toHaveBeenCalled()
	})
})

/**
 * A Dialog in a Popover in an outer overlay. The Popover is the nearest
 * surface, so it is the reference of the Dialog, and a press in the Dialog
 * keeps the Popover and the outer overlay open.
 */
function PopoverDialog({
	outer,
	onOuterChange,
	onPopoverChange,
}: {
	outer: 'sheet' | 'dialog'
	onOuterChange: (open: boolean) => void
	onPopoverChange: (open: boolean) => void
}) {
	const [outerOpen, setOuterOpen] = useState(false)

	const [innerOpen, setInnerOpen] = useState(false)

	const changeOuter = (open: boolean) => {
		onOuterChange(open)

		setOuterOpen(open)
	}

	const content = (
		<>
			<p>Outer</p>
			<Popover onOpenChange={onPopoverChange}>
				<PopoverTrigger>
					<button type="button">Open popover</button>
				</PopoverTrigger>
				<PopoverContent aria-label="Actions">
					<button type="button" onClick={() => setInnerOpen(true)}>
						Open inner dialog
					</button>
					<Dialog open={innerOpen} onOpenChange={setInnerOpen}>
						<DialogPanel>
							<DialogTitle>Inner</DialogTitle>
							<p data-testid="inner-body">Inner</p>
						</DialogPanel>
					</Dialog>
				</PopoverContent>
			</Popover>
		</>
	)

	return (
		<>
			<button type="button" onClick={() => setOuterOpen(true)}>
				Open outer
			</button>
			{outer === 'sheet' ? (
				<Sheet open={outerOpen} onOpenChange={changeOuter}>
					<SheetPanel side="start" modal={false} footer={null} aria-label="Navigation">
						{content}
					</SheetPanel>
				</Sheet>
			) : (
				<Dialog open={outerOpen} onOpenChange={changeOuter}>
					<DialogPanel>
						<DialogTitle>Outer</DialogTitle>
						{content}
					</DialogPanel>
				</Dialog>
			)}
		</>
	)
}

describe.each(['sheet', 'dialog'] as const)(
	'a Dialog in a Popover in a %s (real browser)',
	(outer) => {
		it('keeps the Popover and the outer overlay open on a press in the Dialog', async () => {
			const onOuterChange = vi.fn()

			const onPopoverChange = vi.fn()

			renderUI(
				<PopoverDialog
					outer={outer}
					onOuterChange={onOuterChange}
					onPopoverChange={onPopoverChange}
				/>,
			)

			fireEvent.click(screen.getByRole('button', { name: 'Open outer' }))

			fireEvent.click(await screen.findByRole('button', { name: 'Open popover' }))

			fireEvent.click(await screen.findByRole('button', { name: 'Open inner dialog' }))

			press(await screen.findByTestId('inner-body'))

			expect(onPopoverChange).not.toHaveBeenCalledWith(false)

			expect(onOuterChange).not.toHaveBeenCalled()
		})
	},
)

describe('a non-modal Sheet with no nested overlay (real browser)', () => {
	it('closes on a press on the page', async () => {
		const onSheetChange = vi.fn()

		renderUI(<NestedOverlays onSheetChange={onSheetChange} />)

		fireEvent.click(screen.getByRole('button', { name: 'Open sheet' }))

		await screen.findByRole('button', { name: 'Open dialog' })

		press(screen.getByTestId('page'))

		await waitFor(() => expect(onSheetChange).toHaveBeenCalledWith(false))
	})
})
