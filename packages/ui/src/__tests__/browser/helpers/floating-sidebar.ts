import type { ReactElement } from 'react'
import { userEvent } from 'vitest/browser'
import { ROOT_OFFCANVAS_SIDEBAR_CLASS } from '../../../core/sidebar/root'
import { frames, getSlot, present, renderUI } from '../../helpers'
import { holdRootClass } from './root-state'
import { settledRect } from './sample'

/** A sidebar layout in its floating mode, from {@link renderFloatingSidebar}. */
export type FloatingSidebar = {
	/** The hover strip on the start edge of the layout. */
	strip: HTMLElement
	/** Moves the pointer over the strip, and gives the sheet when its box settles. */
	open: () => Promise<HTMLElement>
}

/**
 * Puts the layout in its floating mode, renders `ui`, and waits until it lays
 * out.
 *
 * The helper adds the offcanvas class to the root element with
 * `holdRootClass`, so the class goes off when the case finishes.
 *
 * @param ui - The tree to render. It holds one `SidebarLayout`.
 * @returns The hover strip, and a function that opens the sheet.
 *
 * @example
 * ```typescript
 * const { open } = await renderFloatingSidebar(<SidebarLayout sidebar={<nav />} />)
 *
 * const sheet = await open()
 * ```
 */
export async function renderFloatingSidebar(ui: ReactElement): Promise<FloatingSidebar> {
	holdRootClass(ROOT_OFFCANVAS_SIDEBAR_CLASS)

	const { container } = renderUI(ui)

	await frames()

	const strip = present(
		getSlot(container, 'sidebar-layout').querySelector<HTMLElement>(':scope > [aria-hidden]'),
		'hover strip',
	)

	const open = async () => {
		await userEvent.hover(strip)

		return settledRect(getSlot(document.body, 'sheet'))
	}

	return { strip, open }
}
