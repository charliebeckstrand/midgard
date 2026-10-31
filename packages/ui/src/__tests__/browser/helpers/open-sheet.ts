import type { ReactElement } from 'react'
import { frames, getSlot, renderUI } from '../../helpers'
import { getCenter } from '../../helpers/geometry/box'
import { drag, type HeldDrag } from './drag'

/** An open sheet with a resize grip, from {@link openSheet}. */
export type OpenSheet = {
	/** The panel of the sheet. */
	panel: HTMLElement
	/**
	 * Presses the center of the grip and moves the pointer `dx` px and `dy` px
	 * from there. The press stays down until the case releases it.
	 */
	dragBy: (dx: number, dy: number) => Promise<HeldDrag>
}

/**
 * Renders `ui`, which holds one open sheet with a resize grip, and waits until
 * the sheet lays out.
 *
 * The sheet portals to the body, so the helper finds the panel and the grip
 * there.
 *
 * @param ui - The tree to render.
 * @returns The panel, and a drag from the center of the grip.
 *
 * @example
 * ```typescript
 * const { panel, dragBy } = await openSheet(<Sheet open onOpenChange={noop}>...</Sheet>)
 *
 * const held = await dragBy(50, 0)
 *
 * await held.release()
 * ```
 */
export async function openSheet(ui: ReactElement): Promise<OpenSheet> {
	renderUI(ui)

	await frames()

	const panel = getSlot(document.body, 'sheet')

	const handle = getSlot(document.body, 'sheet-handle')

	const dragBy = (dx: number, dy: number) => {
		const { x, y } = getCenter(handle)

		return drag(handle, { x, y }, [{ x: x + dx, y: y + dy }])
	}

	return { panel, dragBy }
}
