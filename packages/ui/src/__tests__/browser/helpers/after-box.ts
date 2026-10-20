import type { Box } from '../../helpers/geometry/box'

/**
 * Gives the box of the `::after` of a host that centers it as a flex item, such
 * as the grip of a resize handle.
 *
 * @remarks
 * A pseudo-element has no `getBoundingClientRect`. The box comes from the
 * computed size of the `::after`, at the center of the content box of the host,
 * where `justify-center` and `items-center` put it.
 *
 * @param host - The element that draws the `::after`.
 * @returns The box of the `::after`, in the coordinates of the viewport.
 */
export function afterBox(host: Element): Box {
	const style = getComputedStyle(host)

	const after = getComputedStyle(host, '::after')

	const rect = host.getBoundingClientRect()

	const inset = (side: 'Left' | 'Top' | 'Right' | 'Bottom') =>
		Number.parseFloat(style[`padding${side}`]) + Number.parseFloat(style[`border${side}Width`])

	const x = (rect.left + inset('Left') + rect.right - inset('Right')) / 2

	const y = (rect.top + inset('Top') + rect.bottom - inset('Bottom')) / 2

	const width = Number.parseFloat(after.width)

	const height = Number.parseFloat(after.height)

	return {
		left: x - width / 2,
		top: y - height / 2,
		right: x + width / 2,
		bottom: y + height / 2,
	}
}
