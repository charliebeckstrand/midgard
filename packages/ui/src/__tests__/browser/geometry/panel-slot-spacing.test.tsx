import type { ReactElement } from 'react'
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
import { DensityProvider } from '../../../providers/density'
import { getSlot, renderUI } from '../../helpers'
import { settledRect } from '../helpers/sample'

/**
 * The inset of a panel is the same on the four sides. It is larger than the gap
 * between two slots, and each gap between two slots is the same. The body is
 * the part that scrolls, so the header and the footer stay in place while it
 * scrolls. The visible space must stay even then too: an inset that is padding
 * inside the scrolling body moves out of view with the content. The inset and
 * the gap take the step of the nearest density scope.
 */

/** Text that is taller than each panel, so the body scrolls. */
const LONG = Array.from({ length: 60 }, (_, index) => `Line ${index + 1}`).map((line) => (
	<p key={line}>{line}</p>
))

type Panel = {
	name: string
	slot: string
	/** The panel with each slot, and a body that scrolls. */
	full: ReactElement
	/** The panel with a body that scrolls and no other slot. */
	bare: ReactElement
}

const PANELS: Panel[] = [
	{
		name: 'Sheet',
		slot: 'sheet',
		full: (
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel>
					<SheetHeader>
						<SheetTitle>Settings</SheetTitle>
						<SheetDescription>Change the settings.</SheetDescription>
					</SheetHeader>
					<SheetBody>{LONG}</SheetBody>
					<SheetFooter>
						<button type="button">Save</button>
					</SheetFooter>
				</SheetPanel>
			</Sheet>
		),
		bare: (
			<Sheet open onOpenChange={() => {}}>
				<SheetPanel aria-label="Bare" footer={null}>
					<SheetBody>{LONG}</SheetBody>
				</SheetPanel>
			</Sheet>
		),
	},
	{
		name: 'Dialog',
		slot: 'dialog',
		full: (
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel>
					<DialogHeader>
						<DialogTitle>Settings</DialogTitle>
						<DialogDescription>Change the settings.</DialogDescription>
					</DialogHeader>
					<DialogBody>{LONG}</DialogBody>
					<DialogFooter>
						<button type="button">Save</button>
					</DialogFooter>
				</DialogPanel>
			</Dialog>
		),
		bare: (
			<Dialog open onOpenChange={() => {}}>
				<DialogPanel aria-label="Bare" footer={null}>
					<DialogBody>{LONG}</DialogBody>
				</DialogPanel>
			</Dialog>
		),
	},
	{
		name: 'Drawer',
		slot: 'drawer',
		full: (
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel>
					<DrawerHeader>
						<DrawerTitle>Settings</DrawerTitle>
						<DrawerDescription>Change the settings.</DrawerDescription>
					</DrawerHeader>
					<DrawerBody>{LONG}</DrawerBody>
					<DrawerFooter>
						<button type="button">Save</button>
					</DrawerFooter>
				</DrawerPanel>
			</Drawer>
		),
		bare: (
			<Drawer open onOpenChange={() => {}}>
				<DrawerPanel aria-label="Bare" footer={null}>
					<DrawerBody>{LONG}</DrawerBody>
				</DrawerPanel>
			</Drawer>
		),
	},
]

const VIEWPORTS = [
	{ name: 'phone', width: 375, height: 812 },
	{ name: 'desktop', width: 1280, height: 800 },
] as const

/** The inset and the slot gap at each density, in pixels. */
const DENSITIES = [
	{ density: 'compact', inset: 20, gap: 12 },
	{ density: 'snug', inset: 24, gap: 16 },
	{ density: 'loose', inset: 28, gap: 20 },
] as const

/** The content box of `el`: the edges that its text starts and stops at. */
function contentBox(el: Element) {
	const box = el.getBoundingClientRect()
	const style = getComputedStyle(el)
	const px = (value: string) => Number.parseFloat(value)

	return {
		top: box.top + px(style.paddingTop),
		right: box.right - px(style.paddingRight),
		bottom: box.bottom - px(style.paddingBottom),
		left: box.left + px(style.paddingLeft),
	}
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

/** Scrolls `el` to the middle of its range, so a padding inside it is out of view. */
function scrollMiddle(el: HTMLElement) {
	el.scrollTop = (el.scrollHeight - el.clientHeight) / 2
}

describe.each(VIEWPORTS)('panel slot spacing at the $name width', ({ width, height }) => {
	beforeAll(() => page.viewport(width, height))

	describe.each(DENSITIES)('at the $density density', ({ density, inset, gap }) => {
		describe.each(PANELS)('$name', ({ slot, full, bare }) => {
			it('keeps the edge insets even and larger than the slot gap, before and after a scroll', async () => {
				renderUI(<DensityProvider density={density}>{full}</DensityProvider>)

				const panel = await settledRect(getSlot(document.body, slot))
				const header = getSlot(panel, `${slot}-header`)
				const body = getSlot(panel, `${slot}-body`)
				const footer = getSlot(panel, `${slot}-footer`)

				// The body is the scroller, so the header and the footer stay in place.
				expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)
				expect(panel.scrollHeight).toBeLessThanOrEqual(panel.clientHeight)

				const measure = () => {
					const panelBox = panel.getBoundingClientRect()
					const title = contentBox(getSlot(panel, `${slot}-title`))
					const footerBox = contentBox(footer)

					return {
						top: title.top - panelBox.top,
						left: title.left - panelBox.left,
						right: panelBox.right - footerBox.right,
						bottom: panelBox.bottom - footerBox.bottom,
						above: visibleTop(body) - contentBox(header).bottom,
						below: footerBox.top - visibleBottom(body),
					}
				}

				const rest = measure()

				expect(rest).toEqual({
					top: inset,
					left: inset,
					right: inset,
					bottom: inset,
					above: gap,
					below: gap,
				})

				scrollMiddle(body)

				expect(measure()).toEqual(rest)
			})

			it('keeps the edge insets of a body with no header or footer while it scrolls', async () => {
				renderUI(<DensityProvider density={density}>{bare}</DensityProvider>)

				const panel = await settledRect(getSlot(document.body, slot))
				const body = getSlot(panel, `${slot}-body`)

				expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)

				expect(contentBox(body).left - panel.getBoundingClientRect().left).toBe(inset)

				const measure = () => {
					const panelBox = panel.getBoundingClientRect()

					return {
						top: visibleTop(body) - panelBox.top,
						bottom: panelBox.bottom - visibleBottom(body),
					}
				}

				expect(measure()).toEqual({ top: inset, bottom: inset })

				scrollMiddle(body)

				expect(measure()).toEqual({ top: inset, bottom: inset })
			})
		})
	})
})
