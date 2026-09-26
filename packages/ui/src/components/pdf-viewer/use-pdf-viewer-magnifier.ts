'use client'

import { useClientPoint, useHover, useInteractions } from '@floating-ui/react'
import {
	type MouseEvent as ReactMouseEvent,
	type PointerEvent as ReactPointerEvent,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from 'react'
import { useFloatingPanel } from '../../hooks'
import type { PdfViewerMagnifierOptions } from './types'

/**
 * The loupe's three settings, in the named steps the prop and the config dialog both speak.
 * @internal
 */
export type MagnifierChoice = Required<Omit<PdfViewerMagnifierOptions, 'mode'>>

/**
 * The same three settings, in the numbers the lens draws with.
 *
 * @remarks The seam the named steps exist for. Everything below this line is arithmetic, and
 * arithmetic has no use for a token. That is the dwell handed to `useHover`, the diameter the
 * lens is sized to, and the magnification {@link lensOffset} solves against. So the steps are
 * resolved once, here, and the rest of the loupe never learns that they exist.
 * @internal
 */
export type ResolvedMagnifier = { zoom: number; size: number; delay: number }

/** One option in the config dialog: the step it sets, and what that step is to the reader. @internal */
export type MagnifierOption<T extends string> = { value: T; label: string }

/** The loupe as it has always been: 2.5× through a 180px lens, after a 300ms dwell. */
const DEFAULT_CHOICE: MagnifierChoice = { zoom: 'md', size: 'md', delay: 'default' }

/*
 * Each scale twice over: the number the lens draws with, and the option the dialog offers.
 *
 * The two halves sit together because they drift apart in silence. A retune of
 * `zoomSteps.lg` leaves a label three files away claiming 4×, with no type error and no
 * failing test to say so. Same arrangement, for the same reason, as `densityLevels` beside
 * `densityToSize` in `providers/density/context.ts`.
 */

/** Magnification for each step. */
const zoomSteps = { sm: 2, md: 2.5, lg: 4 } as const

/** The magnification steps, each named by the power it is. @internal */
export const zoomOptions: readonly MagnifierOption<MagnifierChoice['zoom']>[] = [
	{ value: 'sm', label: '2×' },
	{ value: 'md', label: '2.5×' },
	{ value: 'lg', label: '4×' },
]

/** Lens diameter in pixels for each step. */
const sizeSteps = { sm: 140, md: 180, lg: 240 } as const

/** @internal */
export const sizeOptions: readonly MagnifierOption<MagnifierChoice['size']>[] = [
	{ value: 'sm', label: 'Small' },
	{ value: 'md', label: 'Medium' },
	{ value: 'lg', label: 'Large' },
]

/** Dwell in milliseconds for each step. */
const delaySteps = { none: 0, default: 300 } as const

/** @internal */
export const delayOptions: readonly MagnifierOption<MagnifierChoice['delay']>[] = [
	{ value: 'none', label: 'None' },
	{ value: 'default', label: 'Default' },
]

/** The dwell a loupe runs on when its settings are withheld, which is while it is switched off. */
const DEFAULT_DELAY = delaySteps[DEFAULT_CHOICE.delay]

/**
 * The shortest hold that opens the lens under a finger, in milliseconds.
 *
 * A floor under the dwell, because the `'none'` step is zero. A mouse can rest with no
 * delay, but a finger that lands to start a scroll must not open a lens first.
 */
const TOUCH_HOLD_MIN = 300

/** How far a finger can drift during the hold, in pixels, before the hold becomes a scroll. */
const TOUCH_SLOP = 10

/** The gap between the lens and a held finger. It is larger than the cursor gap, because a fingertip covers more of the page. */
const TOUCH_OFFSET = 48

/**
 * Fill in the steps the consumer left out.
 *
 * @param options - The consumer's {@link PdfViewerProps.magnifier} settings.
 * @returns The same three settings, with every one of them named.
 * @remarks Field by field rather than a spread over the defaults: an explicitly `undefined`
 * setting then takes its default, and does not erase it.
 * @internal
 */
export function resolveMagnifierChoice(options: PdfViewerMagnifierOptions): MagnifierChoice {
	return {
		zoom: options.zoom ?? DEFAULT_CHOICE.zoom,
		size: options.size ?? DEFAULT_CHOICE.size,
		delay: options.delay ?? DEFAULT_CHOICE.delay,
	}
}

/**
 * Read the named steps off as the numbers the lens draws with.
 *
 * @param choice - The settings, as the consumer or the reader left them.
 * @returns The same settings in pixels, milliseconds, and a bare multiplier.
 * @internal
 */
export function resolveMagnifier(choice: MagnifierChoice): ResolvedMagnifier {
	return {
		zoom: zoomSteps[choice.zoom],
		size: sizeSteps[choice.size],
		delay: delaySteps[choice.delay],
	}
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
 * the offset that puts it at the lens's center gives `centre - zoom * p`.
 *
 * Pure, and exported for the same reason {@link toFractionRect} is. It is the one seam where
 * this arithmetic is provable without a measured DOM and a real floating engine, neither of
 * which jsdom has.
 *
 * @internal
 */
export function lensOffset(point: MagnifierPoint, zoom: number, size: number): MagnifierPoint {
	const center = size / 2

	return { x: center - zoom * point.x, y: center - zoom * point.y }
}

/** @internal */
export type PdfViewerMagnifierResult = {
	open: boolean
	point: MagnifierPoint | null
	/** Spread onto the page frame — the surface the loupe reads and the hover reference. */
	referenceProps: Record<string, unknown>
	/** Spread onto the lens. */
	floatingProps: Record<string, unknown>
	setReference: (node: HTMLElement | null) => void
	setFloating: (node: HTMLElement | null) => void
	floatingStyles: React.CSSProperties
}

/**
 * Drives the loupe over the page: a hover for a mouse, and a hold for a finger.
 *
 * @param settings - Resolved settings, or `null` when the consumer did not ask for a loupe or
 * the reader turned it off. In that case every interaction hook is disabled and the reference
 * props are empty. A viewer without one therefore pays nothing but a disabled hook.
 * @returns The hover loupe's state:
 *
 * - Whether it is open.
 * - Where on the page the pointer is.
 * - The floating-ui plumbing that puts the lens beside the cursor.
 *
 * @remarks Hovering comes from floating-ui rather than from timers and listeners written
 * here. `useHover`'s open delay is the dwell, and `useClientPoint` is what makes the cursor
 * the positioning reference. The lens therefore follows the pointer with the same collision
 * handling (`shift`, `flip`) every other floating surface in the package gets. It stays on
 * screen at the edges of the page, instead of hanging off them.
 *
 * The one thing floating-ui does not supply is where the pointer is *within the page*. That
 * is what decides which part of the scan the lens shows. It is tracked here, in the frame's
 * own coordinate space, so it composes with the page transform without knowing the rotation.
 *
 * The pan is handled here for the same reason, and floating-ui cannot handle it (see
 * {@link handlePan}). Floating-ui reasons about pointers, and a pan moves the page with no
 * pointer movement.
 *
 * The hold is handled here too (see {@link hold}), because `useHover` is mouse only. A dwell
 * under a finger would fight the scroll. The hold opens the lens with the same state that the
 * hover sets, and places it above the finger. From there, the positioning is the same.
 * @internal
 */
export function usePdfViewerMagnifier(
	settings: ResolvedMagnifier | null,
): PdfViewerMagnifierResult {
	const enabled = settings !== null

	const [open, setOpen] = useState(false)

	/*
	 * Whether a held finger opened the lens. It moves the lens from beside the cursor to above
	 * the finger, where the hand does not cover it.
	 */
	const [touch, setTouch] = useState(false)

	/** The pointer, in both spaces. See {@link track}. */
	type Tracking = { local: MagnifierPoint; client: MagnifierPoint }

	/*
	 * The pointer, in both spaces, in one piece of state.
	 *
	 * Frame-local coordinates decide which part of the scan the lens shows; client coordinates
	 * are what positions the lens itself. One object rather than two states, because they are
	 * read from the same event and must never disagree. A lens positioned from one move and
	 * filled from another would show the wrong ink for exactly one frame.
	 *
	 * **The ref holds the client point until the lens is open. Only then does state carry
	 * both.** This hook lives in `PdfViewerMagnifierProvider`, so a state write here re-renders
	 * that provider, the page frame, and the lens. A pointer that crosses the scan does that
	 * 60-120 times a second. Usually the lens never opens, because the dwell stops most
	 * crossings. The open edge needs only the client point: {@link locate} gets the frame-local
	 * point from it against a fresh rect. Thus a closed lens does no `getBoundingClientRect` for
	 * each move.
	 */
	const trackingRef = useRef<MagnifierPoint | null>(null)

	const [tracking, setTracking] = useState<Tracking | null>(null)

	// Read by `track`, which must not be rebuilt per render — it goes into `getReferenceProps`.
	const openRef = useRef(open)

	openRef.current = open

	/**
	 * The frame, kept from the events that already carry it — see {@link track}.
	 *
	 * Not floating-ui's `domReference`, though it holds the same node. `useClientPoint` makes
	 * the *cursor* the positioning reference. Which of that hook's refs still points at the
	 * page is therefore its business, and not a thing to depend on. The pointer events are
	 * already delivered by the frame; `currentTarget` is the frame by construction.
	 */
	const frameRef = useRef<HTMLElement | null>(null)

	/**
	 * Where the pointer sits in the frame, measured against where the frame is **now**.
	 *
	 * The tracked point is two facts with different shelf lives. Client coordinates stay true
	 * until the pointer moves, and the pointer reports every move. Frame-local coordinates stop
	 * being true the moment anything moves the frame: a pan, a zoom step, a rotation. None of
	 * those is a pointer event, so nothing tells the lens its ink went stale. Re-deriving one
	 * from the other at each moment the lens is about to paint costs a `getBoundingClientRect`.
	 * That edge happens at most twice per dwell, and it makes every one of those cases the same
	 * case.
	 */
	const locate = useCallback((): Tracking | null => {
		const client = trackingRef.current

		const frame = frameRef.current

		if (!client || !frame) return null

		const rect = frame.getBoundingClientRect()

		return { local: { x: client.x - rect.left, y: client.y - rect.top }, client }
	}, [])

	/*
	 * Opening re-locates whatever the ref last saw, so the lens has true coordinates on the
	 * frame it first paints. Closing drops them, rather than leaving a stale point behind.
	 */
	const handleOpenChange = useCallback(
		(next: boolean) => {
			setOpen(next)
			setTracking(next ? locate() : null)
		},
		[locate],
	)

	const { refs, floatingStyles, context } = useFloatingPanel({
		open: enabled && open,
		onOpenChange: handleOpenChange,
		// Beside the cursor rather than under it: a lens centered on the pointer would cover the
		// very ink the reader is pointing at. Above a finger, because the hand covers everything
		// below it and to one side of it.
		placement: touch ? 'top' : 'right-start',
		// Fixed, unlike the package's anchored surfaces, because the reference here is the
		// cursor — `useClientPoint` reports it in viewport coordinates. Under the default
		// `absolute` strategy those get resolved against the portal's offset parent, so the lens
		// lands short by however far the page or any scroll container between them has scrolled;
		// the viewer's own viewport is a scroll container, and it is routinely inside another.
		strategy: 'fixed',
		// Clears the lens of the cursor. The rest of the chain — flip, then shift with the
		// standard padding — is the package's own, so the loupe follows it wherever it moves.
		offset: touch ? TOUCH_OFFSET : 24,
	})

	const hover = useHover(context, {
		enabled,
		// The dwell. Closing is immediate — a lens that lingered after the pointer left the page
		// would sit over the toolbar it was moving towards.
		delay: { open: settings?.delay ?? DEFAULT_DELAY, close: 0 },
		// A dwell under a fingertip would fight the scroll gesture for the same pointer. A finger
		// opens the lens by a hold instead — see {@link hold}.
		mouseOnly: true,
	})

	/*
	 * The cursor is the positioning reference, and its coordinates are supplied rather than
	 * left for the hook to observe.
	 *
	 * Gating this on `open` was the bug behind the lens appearing far to the right and then
	 * snapping. On the tick the dwell fired, the hook had just been enabled and had recorded
	 * nothing. The engine then positioned against the reference *element*. That put the lens
	 * 24px past the whole page frame's right edge, until the next pointer move gave it a real
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
	 * Record the pointer. Also on enter, not only on move. A pointer that arrives and stops
	 * fires no further move, and the dwell would then elapse with nothing tracked.
	 *
	 * Writes state only while the lens is open — see {@link trackingRef}.
	 */
	const track = useCallback((event: ReactPointerEvent<HTMLElement>) => {
		if (event.pointerType !== 'mouse') return

		frameRef.current = event.currentTarget

		const client = { x: event.clientX, y: event.clientY }

		trackingRef.current = client

		// Only the open lens needs frame-local coordinates, and only it pays the layout read.
		if (!openRef.current) return

		const rect = event.currentTarget.getBoundingClientRect()

		setTracking({ local: { x: client.x - rect.left, y: client.y - rect.top }, client })
	}, [])

	/**
	 * Drops the tracked point: the pointer has left the scan, so there is nothing to magnify.
	 *
	 * Mouse only. A finger leaves the page only when it lifts, and {@link release} ends a hold.
	 */
	const leave = useCallback((event: ReactPointerEvent<HTMLElement>) => {
		if (event.pointerType !== 'mouse') return

		trackingRef.current = null

		if (openRef.current) setTracking(null)
	}, [])

	/** The finger that is holding, where it landed, and the timer that opens the lens under it. */
	type Hold = { id: number; start: MagnifierPoint; timer: number }

	const holdRef = useRef<Hold | null>(null)

	/** Whether the hold has opened the lens. Read by the native `touchmove` listener below. */
	const holdingRef = useRef(false)

	/** True after a hold ends on a lift. The click that the lift can fire then presses no region. */
	const swallowClickRef = useRef(false)

	/*
	 * Read by `hold`, which goes into `getReferenceProps` and must not be rebuilt when the
	 * settings change.
	 */
	const holdDelayRef = useRef<number>(TOUCH_HOLD_MIN)

	holdDelayRef.current = Math.max(settings?.delay ?? DEFAULT_DELAY, TOUCH_HOLD_MIN)

	/**
	 * Ends the hold, and closes the lens if the hold opened it.
	 *
	 * @param lifted - The finger lifted with the lens open. The click that follows the lift is
	 * then swallowed, because the reader was reading, not pressing.
	 */
	const endHold = useCallback((lifted = false) => {
		const hold = holdRef.current

		if (!hold) return

		window.clearTimeout(hold.timer)

		holdRef.current = null

		trackingRef.current = null

		if (!holdingRef.current) return

		holdingRef.current = false

		swallowClickRef.current = lifted

		setOpen(false)

		setTracking(null)

		setTouch(false)
	}, [])

	/**
	 * Starts a hold: a finger that rests on the page for the dwell opens the lens above it.
	 *
	 * @remarks The touch counterpart of the dwell. It is the gesture of the iOS text loupe. A
	 * finger that drifts past {@link TOUCH_SLOP} before the lens opens is a scroll, and the hold
	 * ends (see {@link drag}). Once the lens is open, the finger moves it, and a lift closes it.
	 *
	 * The hold leaves the browser's own long-press menu alone. Nothing here cancels a
	 * `contextmenu` event or sets `-webkit-touch-callout`. A finger that stays still until the
	 * menu opens gets the menu, and the lens gives way to it (see {@link yieldToMenu}). A finger
	 * that moves after the lens opens is magnifying, and that movement cancels the long press
	 * in the browser.
	 */
	const hold = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (event.pointerType === 'mouse' || !event.isPrimary) return

			window.clearTimeout(holdRef.current?.timer)

			swallowClickRef.current = false

			frameRef.current = event.currentTarget

			const start = { x: event.clientX, y: event.clientY }

			trackingRef.current = start

			const timer = window.setTimeout(() => {
				const located = locate()

				if (!located) return

				holdingRef.current = true

				setTouch(true)

				setTracking(located)

				setOpen(true)
			}, holdDelayRef.current)

			holdRef.current = { id: event.pointerId, start, timer }
		},
		[locate],
	)

	/** Moves the held lens, or ends a hold that has become a scroll. */
	const drag = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			const current = holdRef.current

			if (!current || event.pointerId !== current.id) return

			const client = { x: event.clientX, y: event.clientY }

			if (!holdingRef.current) {
				const drift = Math.hypot(client.x - current.start.x, client.y - current.start.y)

				if (drift > TOUCH_SLOP) endHold()

				return
			}

			trackingRef.current = client

			const rect = event.currentTarget.getBoundingClientRect()

			setTracking({ local: { x: client.x - rect.left, y: client.y - rect.top }, client })
		},
		[endHold],
	)

	/** One move handler for both pointers: the mouse is tracked, and a finger drags. */
	const move = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (event.pointerType === 'mouse') track(event)
			else drag(event)
		},
		[track, drag],
	)

	/** A lift, or a cancel from the browser, ends the hold of that finger. */
	const release = useCallback(
		(event: ReactPointerEvent<HTMLElement>) => {
			if (event.pointerId !== holdRef.current?.id) return

			endHold(event.type === 'pointerup')
		},
		[endHold],
	)

	/**
	 * The browser's long-press menu is opening, so the lens closes and does not cover it.
	 *
	 * @remarks It does not cancel the event: the menu is the browser's, and it opens as it
	 * would on a viewer with no loupe. A right click has no hold, so a mouse gets no change.
	 */
	const yieldToMenu = useCallback(() => {
		endHold()
	}, [endHold])

	/** Swallows the click that the lift at the end of a hold can fire. */
	const swallowClick = useCallback((event: ReactMouseEvent<HTMLElement>) => {
		if (!swallowClickRef.current) return

		swallowClickRef.current = false

		event.preventDefault()

		event.stopPropagation()
	}, [])

	/**
	 * The page frame, as state, so the `touchmove` listener below can attach to the node.
	 *
	 * @remarks The listener must be on the node before the finger lands. A browser decides at
	 * the touch start whether a listener can cancel the scroll, and one added later cannot.
	 */
	const [frameNode, setFrameNode] = useState<HTMLElement | null>(null)

	const setReference = useCallback(
		(node: HTMLElement | null) => {
			refs.setReference(node)

			setFrameNode(node)
		},
		[refs],
	)

	/*
	 * Holds the page still while the finger moves the lens.
	 *
	 * Native and non-passive, because React attaches its touch listeners as passive, and a
	 * passive listener cannot cancel. It cancels only while a hold has the lens open. Before
	 * that, a finger still scrolls the page as it did. The same technique as the map's pinch.
	 */
	useEffect(() => {
		if (!enabled || !frameNode) return

		function handleTouchMove(event: TouchEvent) {
			if (holdingRef.current && event.cancelable) event.preventDefault()
		}

		frameNode.addEventListener('touchmove', handleTouchMove, { passive: false })

		return () => frameNode.removeEventListener('touchmove', handleTouchMove)
	}, [enabled, frameNode])

	/* A hold does not outlive the loupe being switched off, or the viewer. */
	useEffect(() => {
		if (!enabled) return

		return () => {
			window.clearTimeout(holdRef.current?.timer)

			holdRef.current = null

			if (!holdingRef.current) return

			holdingRef.current = false

			setOpen(false)

			setTracking(null)

			setTouch(false)
		}
	}, [enabled])

	/*
	 * Both bags are memoized, and `leave` is a callback rather than a literal, because they are
	 * dependencies of the result below. An inline handler — or a bare `getReferenceProps()` call
	 * — allocates on every render, which would defeat that memo and, through it, the value
	 * of `PdfViewerMagnifierContext`. The floating-ui getters are stable until an interaction's own
	 * inputs move, so these hold across every render that leaves the lens alone.
	 */
	const referenceProps = useMemo(
		() =>
			enabled
				? getReferenceProps({
						onPointerEnter: track,
						onPointerMove: move,
						onPointerLeave: leave,
						onPointerDown: hold,
						onPointerUp: release,
						onPointerCancel: release,
						onContextMenu: yieldToMenu,
						onClickCapture: swallowClick,
					})
				: EMPTY_PROPS,
		[enabled, getReferenceProps, track, move, leave, hold, release, yieldToMenu, swallowClick],
	)

	const floatingProps = useMemo(
		() => (enabled ? getFloatingProps() : EMPTY_PROPS),
		[enabled, getFloatingProps],
	)

	/** Pending re-open. One at a time: each scroll event replaces the last. */
	const settleRef = useRef<number | undefined>(undefined)

	/**
	 * A pan withdraws the lens, and the page has to come to rest before it returns.
	 *
	 * A pan is the one gesture that moves the page under a pointer that has not moved. That
	 * makes it the one the loupe cannot see. No pointer event fires. The lens therefore keeps
	 * holding the ink it was filled with several hundred pixels ago, and reads as pinned to the
	 * wrong place. Following the scroll instead would be worse. A lens that repaints every
	 * frame of a pan is a smear over the very page the reader is trying to move.
	 *
	 * So it leaves, and comes back the way it first arrived: after the same dwell. The pause is
	 * doing the same work at the end of a pan that it does at the start of a hover. It reads
	 * the reader's stillness as the moment they have chosen somewhere to look. Reusing the
	 * setting, rather than inventing a second one, means a consumer that tuned the dwell has
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
		}, settings?.delay ?? DEFAULT_DELAY)
	}, [locate, settings?.delay])

	/*
	 * Every scroller, through one listener.
	 *
	 * A scroll event does not bubble, so a handler on the viewer's own viewport hears only the
	 * pans the reader makes inside it. The page moves under the lens just as far when the
	 * scroller is a drawer around the viewer, or the document itself. Neither of those reaches
	 * a prop on the viewport. Caught on the way down instead, where every scroll in the
	 * document passes through — {@link handlePan} answers for the cost of that.
	 *
	 * A pending re-open does not outlive the loupe being switched off. A reader who turns it
	 * off and back on inside one dwell does not get a lens they never hovered for.
	 */
	useEffect(() => {
		if (!enabled) return

		function handleScroll(event: Event) {
			// Every scroll in the document reaches this, so a reader working anywhere else on the
			// page must pay one boolean for it. A closed lens with nothing tracked has no ink to
			// go stale and nowhere to come back to — and answering that here, before the walk
			// below, is what keeps the cost to the boolean.
			if (!openRef.current && trackingRef.current === null) return

			const frame = frameRef.current

			// Only a scroller the page hangs inside can move the page. A list somewhere else on
			// the screen cannot, and a lens that withdrew for one would be flinching at nothing.
			if (frame && !(event.target as Node).contains(frame)) return

			// A finger that scrolls the page was never holding it. The hold ends, and the lens
			// does not come back when the scroll stops: the finger is gone.
			if (holdRef.current) {
				endHold()

				return
			}

			handlePan()
		}

		document.addEventListener('scroll', handleScroll, true)

		return () => {
			document.removeEventListener('scroll', handleScroll, true)

			window.clearTimeout(settleRef.current)
		}
	}, [enabled, handlePan, endHold])

	/*
	 * Memoized because this object is the value of `PdfViewerMagnifierContext`. A fresh literal
	 * here would re-render the page frame and the lens on each render of the provider.
	 */
	return useMemo(
		() => ({
			open: enabled && open,
			point: tracking?.local ?? null,
			referenceProps,
			floatingProps,
			setReference,
			setFloating: refs.setFloating,
			floatingStyles,
		}),
		[enabled, open, tracking, referenceProps, floatingProps, setReference, refs, floatingStyles],
	)
}

/** One identity for "this hook contributes nothing", so a disabled loupe is memo-stable too. */
const EMPTY_PROPS: Record<string, unknown> = {}
