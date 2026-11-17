'use client'

import {
	flip,
	getOverflowAncestors,
	type Middleware,
	type MiddlewareState,
	offset,
	type Padding,
	shift,
	size,
} from '@floating-ui/react'
import { useComposedRefs } from 'motion/react'
import {
	type CSSProperties,
	useCallback,
	useEffect,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useFloatingPanel } from '../../hooks/use-floating-panel'
import { cellChrome } from './engine/grid-sizing/measure'

/** The widest that a grown editor gets, in rem. @internal */
const GROW_MAX_REM = 28

/**
 * The font properties that a mirror of a field copies, so that it lays out
 * the text of the field with the same glyphs. A canvas has no
 * `font-variant-numeric`, so it measured proportional figures where the field
 * shows tabular figures (see `k.table`).
 *
 * @internal
 */
const FONT_PROPERTIES = [
	'font-family',
	'font-size',
	'font-style',
	'font-weight',
	'font-stretch',
	'font-variant',
	'font-feature-settings',
	'font-variation-settings',
	'font-kerning',
	'letter-spacing',
	'word-spacing',
	'text-transform',
] as const

/**
 * The width of the widest line of `text` in the font of `field`, in px. The
 * text of a field is not in the DOM, so a range cannot measure it. A hidden
 * mirror in the font of the field lays out the text for one read, and then
 * leaves the document in the same task, so it never paints. The mirror is out
 * of the flow, so its layout moves no other box.
 *
 * @internal
 */
function textWidth(field: HTMLInputElement | HTMLTextAreaElement, text: string): number {
	const style = getComputedStyle(field)

	const mirror = field.ownerDocument.createElement('span')

	for (const property of FONT_PROPERTIES) {
		mirror.style.setProperty(property, style.getPropertyValue(property))
	}

	// `pre` keeps each line of the text on one line, and the box of an
	// absolute span is as wide as its widest line.
	Object.assign(mirror.style, {
		position: 'absolute',
		top: '0',
		left: '0',
		visibility: 'hidden',
		whiteSpace: 'pre',
	})

	mirror.textContent = text

	field.ownerDocument.body.append(mirror)

	const width = mirror.getBoundingClientRect().width

	mirror.remove()

	return width
}

/**
 * The width of the content box of `element`, in px. It reads the box
 * unrounded, as the grid sizes a column, so a value that the column fits
 * exactly reads as fitting.
 *
 * @internal
 */
function contentWidth(element: HTMLElement): number {
	return element.getBoundingClientRect().width - cellChrome(element)
}

/** The input types whose value is a line of text that can be wider than the cell. @internal */
const TEXT_TYPES = new Set(['text', 'search', 'email', 'url', 'tel', 'number'])

/** The focused field in `slot` that can grow, or `null`. @internal */
function growingField(slot: HTMLElement): HTMLInputElement | HTMLTextAreaElement | null {
	const field = slot.ownerDocument.activeElement

	if (!slot.contains(field)) return null

	if (field instanceof HTMLTextAreaElement) return field

	return field instanceof HTMLInputElement && TEXT_TYPES.has(field.type) ? field : null
}

/**
 * How the editor in `slot` grows past the content box of `cell`: the width
 * that it needs past the cell, in px, or `null` when the editor fits. Only a
 * text input or a text area that has focus grows, and only when its text is
 * wider than the cell. A value that fits stays in the cell, so the editor and
 * the controls below it do not move as focus comes and goes. The parts of the
 * editor beside the field, such as the steppers of a number input, keep their
 * width, so they count as they are. A grown editor adds one em of space after
 * the text, which keeps the next character in view, so the text does not
 * scroll and then jump back as the editor grows.
 *
 * A text area also grows when its text has more than one line, with a width
 * of 0 past the cell when each line fits. In the cell it shows one line. When
 * it grows, it shows each line. The text decides, not the layout, so the
 * editor does not grow and shrink in turn as the cell clips the text area.
 *
 * @internal
 */
function measureGrow(slot: HTMLElement, cell: HTMLElement): number | null {
	const field = growingField(slot)

	if (!field) return null

	const room = contentWidth(cell)

	// A cell with no box, such as a cell in a jsdom document, has nothing to
	// grow past.
	if (!(room > 0)) return null

	// The parts of the editor beside the field: the content width of the slot,
	// less the content width of the field. A grown slot is wider, and so is its
	// field, so the difference stays the same.
	const beside = contentWidth(slot) - contentWidth(field)

	const needed = textWidth(field, field.value) + beside

	const lines = field instanceof HTMLTextAreaElement && field.value.includes('\n')

	if (needed <= room) return lines ? 0 : null

	const fontSize = Number.parseFloat(getComputedStyle(field).fontSize)

	return Math.ceil(needed + fontSize - room)
}

/**
 * How the focused editor in `slot` grows past `cell` (see {@link measureGrow}).
 * It is `null` while the editor fits, while no field in the slot that can
 * grow has focus, or while either element is `null`. It follows each
 * keystroke, so the editor grows as the user types, and each value that a
 * render writes, such as the revert of Escape.
 *
 * @internal
 */
function useGrow(slot: HTMLElement | null, cell: HTMLElement | null): number | null {
	const [grow, setGrow] = useState<number | null>(null)

	// The value of the last set. A focus move or a keystroke that leaves the
	// growth as it is sets nothing, so the host does not render again.
	const growRef = useRef<number | null>(null)

	const set = useCallback((next: number | null) => {
		if (next === growRef.current) return

		growRef.current = next

		setGrow(next)
	}, [])

	// The field and the value of the last measure.
	const measuredRef = useRef<{ field: Element | null; value: string | undefined } | null>(null)

	const measure = useCallback(() => {
		if (!slot || !cell) return

		const field = growingField(slot)

		measuredRef.current = { field, value: field?.value }

		set(measureGrow(slot, cell))
	}, [slot, cell, set])

	// A value that React writes, such as the revert of Escape, fires no `input`
	// event, so a render of the host that changed the value measures again. A
	// render that left the value as it is measures nothing. The growth itself
	// renders the host, and a field that does not widen with the slot then
	// measures a new growth on each render.
	useLayoutEffect(() => {
		if (!slot || !cell) return

		const field = growingField(slot)

		const last = measuredRef.current

		if (last && last.field === field && last.value === field?.value) return

		measure()
	})

	useEffect(() => {
		if (!slot || !cell) return

		// A focus move out of the slot ends the growth. A move to another control
		// in the slot measures again on its `focusin`.
		const leave = (event: FocusEvent) => {
			if (event.relatedTarget instanceof Node && slot.contains(event.relatedTarget)) return

			set(null)
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
	}, [slot, cell, set, measure])

	return grow
}

/**
 * The space at the top of the scroll area that the head of the grid takes,
 * as the padding of `flip` and `size`. A grown editor then grows up only to
 * the bottom edge of the head, and it does not cover the column titles. A
 * sticky head always takes its height. A head that scrolls takes the part of
 * it that shows.
 *
 * @internal
 */
function headInset({ elements }: MiddlewareState): Padding {
	const cell = elements.reference as Element

	const head = cell.closest('table')?.tHead

	if (!head) return 0

	// The scroll area clips at its top edge, or at the top edge of the viewport
	// when the page hides its top.
	const [area] = getOverflowAncestors(head)

	const top = Math.max(area instanceof Element ? area.getBoundingClientRect().top : 0, 0)

	return { top: Math.max(0, head.getBoundingClientRect().bottom - top) }
}

/**
 * Sets the size of a grown editor. The width is the width of the cell and
 * `grow`, at most the width of the scroll area and {@link GROW_MAX_REM}, and
 * never less than the cell. The least height is the height of the cell, and
 * the greatest height is the height that the scroll area has on the side of
 * the editor, so a tall text area scrolls in the editor. It wraps `size`,
 * which measures the space that the scroll area has.
 *
 * @remarks `useFloating` keeps its middleware while the new chain is equal to
 * it, and it compares a function by its source. A `size` with a new `grow` in
 * its `apply` has the same source, so `grow` goes in `options` too, where the
 * compare sees it.
 *
 * @internal
 */
function growSize(grow: number): Middleware {
	const sized = size((state) => ({
		padding: headInset(state),
		apply({ rects, availableWidth, availableHeight, elements }) {
			const { floating } = elements

			const rem = Number.parseFloat(
				getComputedStyle(floating.ownerDocument.documentElement).fontSize,
			)

			const cap = Math.max(rects.reference.width, Math.min(availableWidth, GROW_MAX_REM * rem))

			floating.style.width = `${Math.min(rects.reference.width + grow, cap)}px`

			floating.style.minHeight = `${rects.reference.height}px`

			floating.style.maxHeight = `${Math.max(rects.reference.height, availableHeight)}px`
		},
	}))

	return { name: 'growSize', options: grow, fn: sized.fn }
}

/**
 * The chain that floats a grown editor over its cell. The offset takes the
 * editor back by the height of the cell, so it covers the cell from its top
 * edge and grows down. A tall editor that has more space above the cell than
 * below flips: it covers the cell from its bottom edge and grows up, to the
 * head at most ({@link headInset}). `shift`
 * keeps it in the scroll area of the grid, so near the end edge it moves
 * toward the start. {@link growSize} sets its size.
 *
 * @internal
 */
function growMiddleware(grow: number): Middleware[] {
	return [
		offset(({ rects }) => -rects.reference.height),
		flip((state) => ({ padding: headInset(state) })),
		shift(),
		growSize(grow),
	]
}

/**
 * Floats the editor slot of a data cell past `cell` while its focused text
 * input or text area needs more room, as a spreadsheet does. The slot stays in the DOM of
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

	const grow = useGrow(slot, cell)

	const grown = grow !== null

	const middleware = useMemo(() => growMiddleware(grow ?? 0), [grow])

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

	// `size` writes the width and the heights on the node. The slot goes back
	// to the flow of the cell as the growth ends, so they go too.
	useLayoutEffect(() => {
		const node = slotRef.current

		if (grown || !node) return

		node.style.width = ''

		node.style.minHeight = ''

		node.style.maxHeight = ''
	}, [grown])

	return { ref, style: grown ? floatingStyles : undefined, grown, slot }
}
