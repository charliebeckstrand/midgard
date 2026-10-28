import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Dialog, DialogPanel } from '../../../components/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Sheet, SheetPanel } from '../../../components/sheet'
import { TooltipAnchor } from '../../../components/tooltip/tooltip-anchor'
import { BarChart } from '../../../modules/chart'
import {
	act,
	bySlot,
	fireEvent,
	frames,
	getSlot,
	present,
	renderUI,
	screen,
	waitFor,
} from '../../helpers'

/**
 * A float paints on the `float` rung, above each overlay, because a float opens
 * from inside a panel too. A float that is anchored under an open overlay must
 * not paint over that overlay. It hides while the overlay covers its anchor,
 * and it comes back when the overlay is gone. A float that is anchored in the
 * overlay, or in a surface opened from it, still paints over it.
 *
 * jsdom has no layout and no paint, so the browser reads the computed
 * visibility of each label.
 */
function Label({ anchor, name }: { anchor: HTMLElement | null; name: string }) {
	return (
		<TooltipAnchor open reference={anchor}>
			<span data-testid={name}>{name}</span>
		</TooltipAnchor>
	)
}

/** Whether the label named `name` paints. */
function shows(name: string): boolean {
	const label = screen.queryByTestId(name)

	return label !== null && getComputedStyle(label).visibility === 'visible'
}

function Page({ container = false }: { container?: boolean }) {
	const [open, setOpen] = useState(false)

	const [dialog, setDialog] = useState(false)

	const [root, setRoot] = useState<HTMLDivElement | null>(null)

	const [page, setPage] = useState<HTMLButtonElement | null>(null)

	const [outside, setOutside] = useState<HTMLButtonElement | null>(null)

	const [inside, setInside] = useState<HTMLButtonElement | null>(null)

	const [nested, setNested] = useState<HTMLButtonElement | null>(null)

	const [inDialog, setInDialog] = useState<HTMLButtonElement | null>(null)

	return (
		<>
			<button ref={setOutside} type="button">
				Outside
			</button>
			<div ref={setRoot} className="relative h-96 w-96">
				<button ref={setPage} type="button" className="mt-40" onClick={() => setOpen(true)}>
					Open
				</button>
				<Sheet open={open} onOpenChange={setOpen}>
					<SheetPanel container={container ? root : undefined} aria-label="Sheet">
						<button ref={setInside} type="button" className="mt-40">
							Inside
						</button>
						<Popover>
							<PopoverTrigger>
								<button type="button">More</button>
							</PopoverTrigger>
							<PopoverContent>
								<button ref={setNested} type="button">
									Nested
								</button>
							</PopoverContent>
						</Popover>
						<button type="button" onClick={() => setDialog(true)}>
							Ask
						</button>
					</SheetPanel>
				</Sheet>
				<Dialog open={dialog} onOpenChange={setDialog}>
					<DialogPanel aria-label="Dialog">
						<button ref={setInDialog} type="button">
							Dialog button
						</button>
					</DialogPanel>
				</Dialog>
			</div>
			<Label anchor={outside} name="outside-label" />
			<Label anchor={page} name="page-label" />
			<Label anchor={inside} name="inside-label" />
			<Label anchor={nested} name="nested-label" />
			<Label anchor={inDialog} name="dialog-label" />
		</>
	)
}

describe('a float under an open overlay', () => {
	it('hides while a Sheet covers its anchor, and comes back after the exit', async () => {
		renderUI(<Page />)

		await waitFor(() => expect(shows('page-label')).toBe(true))

		fireEvent.click(screen.getByRole('button', { name: 'Open' }))

		await waitFor(() => expect(shows('inside-label')).toBe(true))

		expect(shows('page-label')).toBe(false)

		expect(shows('outside-label')).toBe(false)

		act(() => {
			fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })
		})

		await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Sheet' })).toBeNull())

		await frames()

		expect(shows('page-label')).toBe(true)
	})

	it('hides only the floats in the container of a scoped Sheet', async () => {
		renderUI(<Page container />)

		await waitFor(() => expect(shows('page-label')).toBe(true))

		fireEvent.click(screen.getByRole('button', { name: 'Open' }))

		await waitFor(() => expect(shows('inside-label')).toBe(true))

		expect(shows('page-label')).toBe(false)

		expect(shows('outside-label')).toBe(true)
	})

	it('shows a float anchored in a surface opened from the Sheet', async () => {
		renderUI(<Page />)

		fireEvent.click(await screen.findByRole('button', { name: 'Open' }))

		fireEvent.click(await screen.findByRole('button', { name: 'More' }))

		await waitFor(() => expect(shows('nested-label')).toBe(true))

		expect(shows('inside-label')).toBe(true)
	})

	it('hides the floats of a Sheet under a Dialog opened from it', async () => {
		renderUI(<Page />)

		fireEvent.click(await screen.findByRole('button', { name: 'Open' }))

		await waitFor(() => expect(shows('inside-label')).toBe(true))

		fireEvent.click(screen.getByRole('button', { name: 'Ask' }))

		await waitFor(() => expect(shows('dialog-label')).toBe(true))

		expect(shows('inside-label')).toBe(false)

		expect(shows('page-label')).toBe(false)
	})

	it('hides a pinned chart readout under a Sheet', async () => {
		function Pinned() {
			const [open, setOpen] = useState(false)

			return (
				<>
					<button type="button" onClick={() => setOpen(true)}>
						Open
					</button>
					<BarChart
						aria-label="Revenue"
						width={400}
						tooltip={{ trigger: 'click' }}
						data={[
							{ q: 'Q1', r: 4 },
							{ q: 'Q2', r: 8 },
						]}
						series={[{ xKey: 'q', yKey: 'r', yName: 'Revenue' }]}
					/>
					<Sheet open={open} onOpenChange={setOpen}>
						<SheetPanel aria-label="Sheet">Sheet</SheetPanel>
					</Sheet>
				</>
			)
		}

		const { container } = renderUI(<Pinned />)

		const hit = getSlot(container, 'chart-hit')

		const box = hit.getBoundingClientRect()

		fireEvent.click(hit, { clientX: box.left + box.width / 4, clientY: box.top + box.height / 2 })

		const readout = await waitFor(() =>
			present(bySlot(document.body, 'tooltip-content'), 'tooltip'),
		)

		await waitFor(() => expect(getComputedStyle(readout).visibility).toBe('visible'))

		fireEvent.click(screen.getByRole('button', { name: 'Open' }))

		await screen.findByRole('dialog', { name: 'Sheet' })

		await waitFor(() => expect(getComputedStyle(readout).visibility).toBe('hidden'))
	})
})
