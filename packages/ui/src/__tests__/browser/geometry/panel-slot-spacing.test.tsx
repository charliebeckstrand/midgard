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
import { DensityProvider } from '../../../providers/density'
import { getSlot, renderUI } from '../../helpers'

/**
 * The inset of a panel is the same on the four sides. It is larger than the gap
 * between two slots, and each gap between two slots is the same. The body is
 * the part that scrolls, so the header and the footer stay in place while it
 * scrolls. The visible space must stay even then too: an inset that is padding
 * inside the scrolling body moves out of view with the content. The inset takes
 * the step of the nearest density scope, and the gap does not.
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

/** The inset at each density, in pixels. The slot gap is 16 at each density. */
const DENSITIES = [
	{ density: 'compact', inset: 20 },
	{ density: 'snug', inset: 24 },
	{ density: 'loose', inset: 28 },
] as const

const GAP = 16

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

/** The left of the content box of `el`. */
function contentLeft(el: Element) {
	const style = getComputedStyle(el)

	return el.getBoundingClientRect().left + Number.parseFloat(style.paddingLeft)
}

/** The right of the content box of `el`. */
function contentRight(el: Element) {
	const style = getComputedStyle(el)

	return el.getBoundingClientRect().right - Number.parseFloat(style.paddingRight)
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

	describe.each(DENSITIES)('at the $density density', ({ density, inset }) => {
		describe.each(PANELS)('$name', ({ slot, full, bare }) => {
			it('keeps the edge insets even and larger than the slot gap, before and after a scroll', async () => {
				renderUI(
					<DensityProvider density={density}>
						{full({
							title: 'Settings',
							description: 'Change the settings.',
							body: LONG,
							footer: 'Save',
						})}
					</DensityProvider>,
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
					const title = getSlot(panel, `${slot}-title`)

					return {
						top: contentTop(title) - panelBox.top,
						left: contentLeft(title) - panelBox.left,
						right: panelBox.right - contentRight(footer),
						bottom: panelBox.bottom - contentBottom(footer),
						above: visibleTop(body) - contentBottom(header),
						below: contentTop(footer) - visibleBottom(body),
					}
				}

				const rest = measure()

				expect(rest).toEqual({
					top: inset,
					left: inset,
					right: inset,
					bottom: inset,
					above: GAP,
					below: GAP,
				})

				scrollMiddle(body)

				expect(measure()).toEqual(rest)
			})

			it('keeps the edge insets of a body with no header or footer while it scrolls', async () => {
				renderUI(<DensityProvider density={density}>{bare(LONG)}</DensityProvider>)

				const panel = await settledPanel(slot)
				const body = getSlot(panel, `${slot}-body`)

				expect(body.scrollHeight).toBeGreaterThan(body.clientHeight)

				expect(contentLeft(body) - panel.getBoundingClientRect().left).toBe(inset)

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
