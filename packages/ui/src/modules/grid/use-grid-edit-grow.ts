'use client'

import { type Middleware, offset, shift, size } from '@floating-ui/react'
import { useComposedRefs } from 'motion/react'
import { type CSSProperties, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFloatingPanel } from '../../hooks/use-floating-ui'

/** The widest that a grown editor gets, in rem. @internal */
const GROW_MAX_REM = 28

/** The canvas that measures the text of an editor, made at the first measure. @internal */
let measureContext: CanvasRenderingContext2D | null | undefined

/**
 * The width of `text` in the font of `input`, in px. The text of an input is
 * not in the DOM, so a range cannot measure it. A canvas measures it in the
 * same font and letter spacing.
 *
 * @internal
 */
function textWidth(input: HTMLInputElement, text: string): number {
	if (measureContext === undefined)
		measureContext = document.createElement('canvas').getContext('2d')

	if (!measureContext) return 0

	const style = getComputedStyle(input)

	measureContext.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`

	measureContext.letterSpacing = style.letterSpacing === 'normal' ? '0px' : style.letterSpacing

	return measureContext.measureText(text).width
}

/** The width of the content box of `element`, in px. @internal */
function contentWidth(element: HTMLElement): number {
	const style = getComputedStyle(element)

	return (
		element.clientWidth -
		Number.parseFloat(style.paddingInlineStart) -
		Number.parseFloat(style.paddingInlineEnd)
	)
}

/** The input types whose value is a line of text that can be wider than the cell. @internal */
const TEXT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'number'])

/**
 * The width that the editor in `slot` needs past the content box of `cell`, in
 * px, or 0 when the editor fits. Only a text input that has focus grows. The
 * parts of the editor beside the input, such as the steppers of a number
 * input, keep their width, so they count as they are. One em of space after
 * the text keeps the next character in view, so the text does not scroll and
 * then jump back as the editor grows.
 *
 * @internal
 */
function measureGrow(slot: HTMLElement, cell: HTMLElement): number {
	const input = slot.ownerDocument.activeElement

	if (!(input instanceof HTMLInputElement) || !slot.contains(input) || !TEXT_TYPES.has(input.type))
		return 0

	// The parts of the editor beside the input: the content width of the slot,
	// less the content width of the input. A grown slot is wider, and so is its
	// input, so the difference stays the same.
	const beside = contentWidth(slot) - contentWidth(input)

	const fontSize = Number.parseFloat(getComputedStyle(input).fontSize)

	const needed = textWidth(input, input.value) + fontSize + beside

	const room = contentWidth(cell)

	// A cell with no box, such as a cell in a jsdom document, has nothing to
	// grow past.
	if (!(room > 0)) return 0

	return Math.max(0, Math.ceil(needed - room))
}

/**
 * The width that the focused text editor in `slot` needs past the content box
 * of `cell`, in px. It is 0 while the editor fits, while no text input in the
 * slot has focus, or while either element is `null`. It follows each
 * keystroke, so the editor grows as the user types.
 *
 * @internal
 */
function useGrowWidth(slot: HTMLElement | null, cell: HTMLElement | null): number {
	const [grow, setGrow] = useState(0)

	// The width of the last set. A focus move or a keystroke that leaves the
	// width as it is sets nothing, so the host does not render again.
	const growRef = useRef(0)

	useEffect(() => {
		if (!slot || !cell) return

		const set = (next: number) => {
			if (next === growRef.current) return

			growRef.current = next

			setGrow(next)
		}

		const measure = () => set(measureGrow(slot, cell))

		// A focus move out of the slot ends the growth. A move to another control
		// in the slot measures again on its `focusin`.
		const leave = (event: FocusEvent) => {
			if (event.relatedTarget instanceof Node && slot.contains(event.relatedTarget)) return

			set(0)
		}

		slot.addEventListener('focusin', measure)

		slot.addEventListener('input', measure)

		slot.addEventListener('focusout', leave)

		// The editor can already have focus as it mounts: the entry that opened
		// it focuses it in the same commit.
		measure()

		return () => {
			slot.removeEventListener('focusin', measure)

			slot.removeEventListener('input', measure)

			slot.removeEventListener('focusout', leave)
		}
	}, [slot, cell])

	return grow
}

/**
 * Sets the width of a grown editor: the width of the cell and `grow`, at most
 * the width of the scroll area and {@link GROW_MAX_REM}, and never less than
 * the cell. It also sets the height of the cell as the least height. It wraps
 * `size`, which measures the width that the scroll area has.
 *
 * @remarks `useFloating` keeps its middleware while the new chain is equal to
 * it, and it compares a function by its source. A `size` with a new `grow` in
 * its `apply` has the same source, so `grow` goes in `options` too, where the
 * compare sees it.
 *
 * @internal
 */
function growWidth(grow: number): Middleware {
	const sized = size({
		apply({ rects, availableWidth, elements }) {
			const { floating } = elements

			const rem = Number.parseFloat(
				getComputedStyle(floating.ownerDocument.documentElement).fontSize,
			)

			const cap = Math.max(rects.reference.width, Math.min(availableWidth, GROW_MAX_REM * rem))

			floating.style.width = `${Math.min(rects.reference.width + grow, cap)}px`

			floating.style.minHeight = `${rects.reference.height}px`
		},
	})

	return { name: 'growWidth', options: grow, fn: sized.fn }
}

/**
 * The chain that floats a grown editor over its cell. The offset takes the
 * editor up by the height of the cell, so it covers the cell from its start
 * edge. `shift` keeps it in the scroll area of the grid, so near the end edge
 * it moves toward the start. {@link growWidth} sets its size.
 *
 * @internal
 */
function growMiddleware(grow: number): Middleware[] {
	return [offset(({ rects }) => -rects.reference.height), shift(), growWidth(grow)]
}

/**
 * Floats the editor slot of a data cell past `cell` while its focused text
 * input needs more room, as a spreadsheet does. The slot stays in the DOM of
 * the cell, so the key surface of the grid, focus, and the commit on leave
 * read it as before. Floating UI places it over the cell from its start edge
 * and grows it toward the inline end. While the editor fits, the slot is in the
 * flow of the cell, and nothing is placed.
 *
 * @returns `ref` for the slot, `style` for the slot while it grows, `grown`,
 * and `slot`, the slot element.
 * @internal
 */
export function useGridEditGrow(cell: HTMLElement | null): {
	ref: (node: HTMLElement | null) => void
	style: CSSProperties | undefined
	grown: boolean
	slot: HTMLElement | null
} {
	const [slot, setSlot] = useState<HTMLElement | null>(null)

	const grow = useGrowWidth(slot, cell)

	const grown = grow > 0

	const middleware = useMemo(() => growMiddleware(grow), [grow])

	const { refs, floatingStyles } = useFloatingPanel({
		placement: 'bottom-start',
		open: grown,
		reference: grown ? cell : null,
		middleware,
	})

	// The slot node, for the clear below. `slot` is state, which the effect
	// must not change.
	const slotRef = useRef<HTMLElement | null>(null)

	const ref = useComposedRefs<HTMLElement>(setSlot, refs.setFloating, slotRef)

	// `size` writes the width and the least height on the node. The slot goes
	// back to the flow of the cell as the growth ends, so they go too.
	useLayoutEffect(() => {
		const node = slotRef.current

		if (grown || !node) return

		node.style.width = ''

		node.style.minHeight = ''
	}, [grown])

	return { ref, style: grown ? floatingStyles : undefined, grown, slot }
}
