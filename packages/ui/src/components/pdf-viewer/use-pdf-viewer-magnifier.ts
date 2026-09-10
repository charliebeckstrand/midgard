'use client'

import {
	autoUpdate,
	flip,
	offset,
	shift,
	useClientPoint,
	useFloating,
	useHover,
	useInteractions,
} from '@floating-ui/react'
import {
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import type { PdfViewerMagnifierOptions } from './types'

/**
 * The hover loupe's state: whether it is open, where on the page the pointer is, and the
 * floating-ui plumbing that puts the lens beside the cursor.
 *
 * @remarks Hovering comes from floating-ui rather than from timers and listeners written
 * here. `useHover`'s open delay is the dwell, and `useClientPoint` is what makes the cursor the
 * positioning reference — so the lens follows the pointer with the same collision handling
 * (`shift`, `flip`) every other floating surface in the package gets, and stays on screen at
 * the edges of the page instead of hanging off them.
 *
 * The one thing floating-ui does not supply is where the pointer is *within the page*, which
 * is what decides which part of the scan the lens shows. That is tracked here, in the frame's
 * own coordinate space, so it composes with the page transform without knowing the rotation.
 *
 * Which is also why the pan is handled here and cannot be (see {@link handlePan}): floating-ui
 * reasons about pointers, and a pan is the one gesture that moves the page *without* one.
 *
 * @internal
 */

/** Resolved magnifier settings — the consumer's object with every default filled in. @internal */
export type ResolvedMagnifier = Required<PdfViewerMagnifierOptions>

const DEFAULTS: ResolvedMagnifier = { zoom: 2.5, size: 180, delay: 300 }

/** Normalize the boolean-or-object prop to settings, or `null` when the loupe is off. @internal */
export function resolveMagnifier(
	magnifier: boolean | PdfViewerMagnifierOptions | undefined,
): ResolvedMagnifier | null {
	if (!magnifier) return null

	return magnifier === true ? DEFAULTS : { ...DEFAULTS, ...magnifier }
}

/** Where the pointer is inside the page frame, in CSS pixels from its top-left. @internal */
export type MagnifierPoint = { x: number; y: number }

/**
 * Where the lens's copy of the page must sit for `point` to land under the crosshair.
 *
 * @param point - The pointer, in the page frame's own coordinates.
 * @param zoom - Magnification.
 * @param size - The lens's diameter.
 * @returns The copy's translation, for a transform whose origin is its top-left corner.
 * @remarks With the origin pinned there, a point `p` maps to `offset + zoom * p`; solving for
 * the offset that puts it at the lens's centre gives `centre - zoom * p`.
 *
 * Pure, and exported for the same reason {@link toFractionRect} is: it is the one seam where
 * this arithmetic is provable without a measured DOM and a real floating engine, neither of
 * which jsdom has.
 */
export function lensOffset(point: MagnifierPoint, zoom: number, size: number): MagnifierPoint {
	const centre = size / 2

	return { x: centre - zoom * point.x, y: centre - zoom * point.y }
}

/** @internal */
export type PdfViewerMagnifierResult = {
	open: boolean
	point: MagnifierPoint | null
	/** Spread onto the page frame — the surface the loupe reads and the hover reference. */
	referenceProps: Record<string, unknown>
	/** Spread onto the lens. */
	floatingProps: Record<string, unknown>
	/** Spread onto the scrolling viewport — the pan the lens has to stand out of. */
	viewportProps: Record<string, unknown>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
}

/**
 * Drives the hover loupe over the page.
 *
 * @param settings - Resolved settings, or `null` when the consumer did not ask for a loupe —
 * in which case every interaction hook is disabled and the reference props are empty, so a
 * viewer without one pays nothing but a disabled hook.
 * @internal
 */
export function usePdfViewerMagnifier(
	settings: ResolvedMagnifier | null,
): PdfViewerMagnifierResult {
	const enabled = settings !== null

	const [open, setOpen] = useState(false)

	/** The pointer, in both spaces. See {@link track}. */
	type Tracking = { local: MagnifierPoint; client: MagnifierPoint }

	/*
	 * The pointer, in both spaces, in one piece of state.
	 *
	 * Frame-local coordinates decide which part of the scan the lens shows; client coordinates
	 * are what positions the lens itself. One object rather than two states because they are
	 * read from the same event and must never disagree — a lens positioned from one move and
	 * filled from another would show the wrong ink for exactly one frame.
	 *
	 * **Held in a ref until the lens is open, and only then mirrored into state.** This hook
	 * lives in `usePdfViewer`, so a state write here re-renders the whole viewer — toolbar (ten
	 * floating stacks and a per-page Listbox), thumbnail rail, highlight provider and every
	 * region on the page. A pointer merely crossing the scan on its way to the toolbar does
	 * that 60-120 times a second for a lens that never appears, and the dwell is 300ms, so
	 * most crossings never open one. The ref costs nothing and is exactly what the open edge
	 * needs to read.
	 */
	const trackingRef = useRef<Tracking | null>(null)

	const [tracking, setTracking] = useState<Tracking | null>(null)

	// Read by `track`, which must not be rebuilt per render — it goes into `getReferenceProps`.
	const openRef = useRef(open)

	openRef.current = open

	/**
	 * The frame, kept from the events that already carry it — see {@link track}.
	 *
	 * Not floating-ui's `domReference`, though it holds the same node: `useClientPoint` makes
	 * the *cursor* the positioning reference, so which of that hook's refs still points at the
	 * page is its business and not a thing to depend on. The pointer events are already
	 * delivered by the frame; `currentTarget` is the frame by construction.
	 */
	const frameRef = useRef<HTMLElement | null>(null)

	/**
	 * Where the pointer sits in the frame, measured against where the frame is **now**.
	 *
	 * The tracked point is two facts with different shelf lives. Client coordinates stay true
	 * until the pointer moves, and the pointer reports every move. Frame-local coordinates stop
	 * being true the moment anything moves the frame — a pan, a zoom step, a rotation — and
	 * none of those is a pointer event, so nothing tells the lens its ink went stale. Re-deriving
	 * one from the other at each moment the lens is about to paint costs a `getBoundingClientRect`
	 * on an edge that happens at most twice per dwell, and makes every one of those cases the
	 * same case.
	 */
	const locate = useCallback((): Tracking | null => {
		const client = trackingRef.current?.client

		const frame = frameRef.current

		if (!client || !frame) return null

		const rect = frame.getBoundingClientRect()

		return { local: { x: client.x - rect.left, y: client.y - rect.top }, client }
	}, [])

	/*
	 * Opening re-locates whatever the ref last saw, so the lens has true coordinates on the
	 * frame it first paints; closing drops them rather than leaving a stale point behind.
	 */
	const handleOpenChange = useCallback(
		(next: boolean) => {
			setOpen(next)
			setTracking(next ? locate() : null)
		},
		[locate],
	)

	const { refs, floatingStyles, context } = useFloating({
		open: enabled && open,
		onOpenChange: handleOpenChange,
		// Beside the cursor rather than under it: a lens centred on the pointer would cover the
		// very ink the reader is pointing at.
		placement: 'right-start',
		// Fixed, unlike the package's anchored surfaces, because the reference here is the
		// cursor — `useClientPoint` reports it in viewport coordinates. Under the default
		// `absolute` strategy those get resolved against the portal's offset parent, so the lens
		// lands short by however far the page or any scroll container between them has scrolled;
		// the viewer's own viewport is a scroll container, and it is routinely inside another.
		strategy: 'fixed',
		middleware: [offset(24), flip(), shift({ padding: 8 })],
		whileElementsMounted: autoUpdate,
	})

	const hover = useHover(context, {
		enabled,
		// The dwell. Closing is immediate — a lens that lingered after the pointer left the page
		// would sit over the toolbar it was moving towards.
		delay: { open: settings?.delay ?? DEFAULTS.delay, close: 0 },
		// A loupe under a fingertip shows what the finger is already covering, and would fight
		// the scroll gesture for the same pointer.
		mouseOnly: true,
	})

	/*
	 * The cursor is the positioning reference, and its coordinates are supplied rather than
	 * left for the hook to observe.
	 *
	 * Gating this on `open` was the bug behind the lens appearing far to the right and then
	 * snapping: on the tick the dwell fired, the hook had just been enabled and had recorded
	 * nothing, so floating-ui positioned against the reference *element* — putting the lens
	 * 24px past the whole page frame's right edge until the next pointer move gave it a real
	 * point. Handing it the coordinates already tracked above means the reference is the cursor
	 * from the first frame the lens exists.
	 */
	const clientPoint = useClientPoint(context, {
		enabled,
		x: tracking?.client.x ?? null,
		y: tracking?.client.y ?? null,
	})

	const { getReferenceProps, getFloatingProps } = useInteractions([hover, clientPoint])

	/*
	 * Record the pointer. Also on enter, not only on move: a pointer that arrives and stops
	 * fires no further move, and the dwell would then elapse with nothing tracked.
	 *
	 * Writes state only while the lens is open — see {@link trackingRef}.
	 */
	const track = useCallback((event: ReactPointerEvent<HTMLElement>) => {
		if (event.pointerType !== 'mouse') return

		frameRef.current = event.currentTarget

		const rect = event.currentTarget.getBoundingClientRect()

		const next: Tracking = {
			local: { x: event.clientX - rect.left, y: event.clientY - rect.top },
			client: { x: event.clientX, y: event.clientY },
		}

		trackingRef.current = next

		if (openRef.current) setTracking(next)
	}, [])

	const referenceProps = enabled
		? getReferenceProps({
				onPointerEnter: track,
				onPointerMove: track,
				onPointerLeave() {
					trackingRef.current = null

					if (openRef.current) setTracking(null)
				},
			})
		: EMPTY_PROPS

	const floatingProps = enabled ? getFloatingProps() : EMPTY_PROPS

	/** Pending re-open. One at a time: each scroll event replaces the last. */
	const settleRef = useRef<number | undefined>(undefined)

	/**
	 * A pan withdraws the lens, and the page has to come to rest before it returns.
	 *
	 * A pan is the one gesture that moves the page under a pointer that has not moved, which
	 * makes it the one the loupe cannot see: no pointer event fires, so the lens keeps holding
	 * the ink it was filled with several hundred pixels ago and reads as pinned to the wrong
	 * place. Following the scroll instead would be worse — a lens that repaints every frame of
	 * a pan is a smear over the very page the reader is trying to move.
	 *
	 * So it leaves, and comes back the way it first arrived: after the same dwell. The pause is
	 * doing the same work at the end of a pan that it does at the start of a hover — reading the
	 * reader's stillness as the moment they have chosen somewhere to look — and reusing the
	 * setting rather than inventing a second one means a consumer that tuned the dwell has
	 * tuned this too.
	 */
	const handlePan = useCallback(() => {
		window.clearTimeout(settleRef.current)

		// Guarded because this is a scroll handler: with the lens closed both of these are
		// already at their next value, and React would still re-render the whole viewer to find
		// that out, once per frame of the pan.
		if (openRef.current) {
			setOpen(false)

			setTracking(null)
		}

		settleRef.current = window.setTimeout(() => {
			const located = locate()

			// Nothing to come back to. The pointer left the page during the pan — either off it,
			// or the page out from under it — and `onPointerLeave` dropped what it was over.
			if (!located) return

			setTracking(located)

			setOpen(true)
		}, settings?.delay ?? DEFAULTS.delay)
	}, [locate, settings?.delay])

	/*
	 * A pending re-open does not outlive the loupe being switched off, so a reader who turns it
	 * off and back on inside one dwell does not get a lens they never hovered for. Nothing is
	 * registered while it is off because nothing can be scheduled while it is off — the viewport
	 * carries no handler then.
	 */
	useEffect(() => {
		if (!enabled) return

		return () => window.clearTimeout(settleRef.current)
	}, [enabled])

	const viewportProps = useMemo(
		() => (enabled ? { onScroll: handlePan } : EMPTY_PROPS),
		[enabled, handlePan],
	)

	/*
	 * Memoized because this object is a dependency of `usePdfViewer`'s context memo, whose
	 * whole purpose is to keep the viewer's context identity stable across renders that touch
	 * none of its fields. A fresh literal here would retire that guarantee for every consumer,
	 * magnifier or not.
	 */
	return useMemo(
		() => ({
			open: enabled && open,
			point: tracking?.local ?? null,
			referenceProps,
			floatingProps,
			viewportProps,
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
		}),
		[enabled, open, tracking, referenceProps, floatingProps, viewportProps, refs, floatingStyles],
	)
}

/** One identity for "this hook contributes nothing", so a disabled loupe is memo-stable too. */
const EMPTY_PROPS: Record<string, unknown> = {}
