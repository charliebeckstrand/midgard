import type { ReactElement, ReactNode } from 'react'
import { beforeAll, describe, expect, it } from 'vitest'
import { page } from 'vitest/browser'
import {
	Dialog,
	DialogBody,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogPanel,
	DialogTitle,
} from '../../../components/dialog'
import {
	Drawer,
	DrawerBody,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerPanel,
	DrawerTitle,
} from '../../../components/drawer'
import {
	Sheet,
	SheetBody,
	SheetDescription,
	SheetFooter,
	SheetHeader,
	SheetPanel,
	SheetTitle,
} from '../../../components/sheet'
import { getSlot, renderUI } from '../../helpers'

/**
 * The slots of a panel are spaced evenly. The space between the panel edge and
 * the first slot is the space between two slots, and the same is true at the
 * bottom edge. The body is the part that scrolls, so the header and the footer
 * stay in place while it scrolls. The visible space must stay even then too:
 * an inset that is padding inside the scrolling body moves out of view with the
 * content.
 */

/** Text that is taller than each panel, so the body scrolls. */
const LONG = Array.from({ length: 60 }, (_, index) => `Line ${index + 1}`).map((line) => (
	<p key={line}>{line}</p>
))

type Parts = { title: string; description: string; body: ReactNode; footer: string }

type Panel = {
	name: string
	slot: string
	full: (parts: Parts) => ReactElement
	bare: (body: ReactNode) => ReactElement
}

const PANELS: Panel[] = [
	{
		name: 'Sheet',
		slot: 'sheet',
		full: ({ title, description, body, footer }) => (
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel>
					<SheetHeader>
						<SheetTitle>{title}</SheetTitle>
						<SheetDescription>{description}</SheetDescription>
					</SheetHeader>
					<SheetBody>{body}</SheetBody>
					<SheetFooter>
						<button type="button">{footer}</button>
					</SheetFooter>
				</SheetPanel>
			</Sheet>
		),
		bare: (body) => (
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel aria-label="Bare" footer={null}>
					<SheetBody>{body}</SheetBody>
				</SheetPanel>
			</Sheet>
		),
	},
	{
		name: 'Dialog',
		slot: 'dialog',
		full: ({ title, description, body, footer }) => (
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>
					<DialogHeader>
						<DialogTitle>{title}</DialogTitle>
						<DialogDescription>{description}</DialogDescription>
					</DialogHeader>
					<DialogBody>{body}</DialogBody>
					<DialogFooter>
						<button type="button">{footer}</button>
					</DialogFooter>
				</DialogPanel>
			</Dialog>
		),
		bare: (body) => (
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel aria-label="Bare" footer={null}>
					<DialogBody>{body}</DialogBody>
				</DialogPanel>
			</Dialog>
		),
	},
	{
		name: 'Drawer',
		slot: 'drawer',
		full: ({ title, description, body, footer }) => (
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel>
					<DrawerHeader>
						<DrawerTitle>{title}</DrawerTitle>
						<DrawerDescription>{description}</DrawerDescription>
					</DrawerHeader>
					<DrawerBody>{body}</DrawerBody>
					<DrawerFooter>
						<button type="button">{footer}</button>
					</DrawerFooter>
				</DrawerPanel>
			</Drawer>
		),
		bare: (body) => (
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Bare" footer={null}>
					<DrawerBody>{body}</DrawerBody>
				</DrawerPanel>
			</Drawer>
		),
	},
]

const VIEWPORTS = [
	{ name: 'phone', width: 375, height: 812 },
	{ name: 'desktop', width: 1280, height: 800 },
] as const

/** The top of the content box of `el`: the edge that its text starts at. */
function contentTop(el: Element) {
	const style = getComputedStyle(el)

	return el.getBoundingClientRect().top + Number.parseFloat(style.paddingTop)
}

/** The bottom of the content box of `el`. */
function contentBottom(el: Element) {
	const style = getComputedStyle(el)

	return el.getBoundingClientRect().bottom - Number.parseFloat(style.paddingBottom)
}

/** The top of the visible content of a scrolling `el`: its padding moves out of view with a scroll. */
function visibleTop(el: HTMLElement) {
	const padding = Number.parseFloat(getComputedStyle(el).paddingTop)

	return el.getBoundingClientRect().top + Math.max(0, padding - el.scrollTop)
}

/** The bottom of the visible content of a scrolling `el`. */
function visibleBottom(el: HTMLElement) {
	const padding = Number.parseFloat(getComputedStyle(el).paddingBottom)

	const hidden = el.scrollHeight - el.clientHeight - el.scrollTop

	return el.getBoundingClientRect().bottom - Math.max(0, padding - hidden)
}

/** Waits until the panel has stopped moving after its entry motion, and returns it. */
async function settledPanel(slot: string): Promise<HTMLElement> {
	const panel = getSlot(document.body, slot)

	let last = ''

	await expect
		.poll(() => {
			const { top, left, bottom, right } = panel.getBoundingClientRect()
			const now = `${top},${left},${bottom},${right}`
			const still = now === last
			last = now
			return still
		})
		.toBe(true)

	return panel
}

/** Scrolls `el` to the middle of its range, so a padding inside it is out of view. */
function scrollMiddle(el: HTMLElement) {
	el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
}

describe.each(VIEWPORTS)('panel slot spacing at the $name width', ({ width, height }) => {
	beforeAll(() => page.viewport(width, height))

	describe.each(PANELS)('$name', ({ slot, full, bare }) => {
		it('keeps the edge insets equal to the slot gap, before and after a scroll', async () => {
			renderUI(
				full({
					title: 'Settings',
					description: 'Change the settings.',
					body: LONG,
					footer: 'Save',
				}),
			)

			const panel = await settledPanel(slot)
			const header = getSlot(panel, `${slot}-header`)
			const body = getSlot(panel, `${slot}-body`)
			const footer = getSlot(panel, `${slot}-footer`)

			// The body is the scroller, so the header and the footer stay in place.
			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
			expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight)

			const measure = () => {
				const panelBox = panel.getBoundingClientRect()

				return {
					top: contentTop(getSlot(panel, `${slot}-title`)) - panelBox.top,
					above: visibleTop(body) - contentBottom(header),
					below: contentTop(footer) - visibleBottom(body),
					bottom: panelBox.bottom - contentBottom(footer),
				}
			}

			const rest = measure()

			expect(rest.above).toBeGreaterThan(0)
			expect(rest).toEqual({
				top: rest.above,
				above: rest.above,
				below: rest.above,
				bottom: rest.above,
			})

			scrollMiddle(body)

			expect(measure()).toEqual(rest)
		})

		it('keeps the edge insets of a body with no header or footer while it scrolls', async () => {
			const view = renderUI(
				full({ title: 'Gap', description: 'Gap.', body: <p>Short</p>, footer: 'Close' }),
			)

			const gapPanel = await settledPanel(slot)
			const gap =
				getSlot(gapPanel, `${slot}-body`).getBoundingClientRect().top -
				contentBottom(getSlot(gapPanel, `${slot}-header`))

			view.unmount()

			renderUI(bare(LONG))

			const panel = await settledPanel(slot)
			const body = getSlot(panel, `${slot}-body`)

			expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)

			const measure = () => {
				const panelBox = panel.getBoundingClientRect()

				return {
					top: visibleTop(body) - panelBox.top,
					bottom: panelBox.bottom - visibleBottom(body),
				}
			}

			expect(measure()).toEqual({ top: gap, bottom: gap })

			scrollMiddle(body)

			expect(measure()).toEqual({ top: gap, bottom: gap })
		})
	})
})
