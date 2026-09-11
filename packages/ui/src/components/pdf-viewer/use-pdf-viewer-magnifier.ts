'use client'

import { useClientPoint, useHover, useInteractions } from '@floating-ui/react'
import {
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

/**
 * The loupe's three settings, in the named steps the prop and the config dialog both speak.
 * @internal
 */
export type MagnifierChoice = Required<Omit<PdfViewerMagnifierOptions, 'mode'>>

/**
 * The same three settings, in the numbers the lens draws with.
 *
 * @remarks The seam the named steps exist for. Everything below this line — the dwell handed
 * to `useHover`, the diameter the lens is sized to, the magnification {@link lensOffset}
 * solves against — is arithmetic, and arithmetic has no use for a token. So the steps are
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
 * The two halves sit together because they drift apart in silence — retune `zoomSteps.lg` and
 * a label three files away goes on claiming 4×, with no type error and no failing test to say
 * so. Same arrangement, for the same reason, as `densityLevels` beside `densityToSize` in
 * `providers/density/context.ts`.
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
	 * **The ref holds the client point until the lens is open, and only then does state carry
	 * both.** This hook lives in `usePdfViewer`, so a state write here re-renders the whole
	 * viewer — toolbar (ten floating stacks and a per-page Listbox), thumbnail rail, highlight
	 * provider and every region on the page. A pointer merely crossing the scan on its way to
	 * the toolbar does that 60-120 times a second for a lens that never appears, and the dwell
	 * is 300ms, so most crossings never open one. The client point is all the open edge needs:
	 * {@link locate} derives the frame-local one from it against a fresh rect. A closed lens
	 * therefore pays no `getBoundingClientRect` per move.
	 */
	const trackingRef = useRef<MagnifierPoint | null>(null)

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
		const client = trackingRef.current

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

	const { refs, floatingStyles, context } = useFloatingPanel({
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
		// Clears the lens of the cursor. The rest of the chain — flip, then shift with the
		// standard padding — is the package's own, so the loupe follows it wherever it moves.
		offset: 24,
	})

	const hover = useHover(context, {
		enabled,
		// The dwell. Closing is immediate — a lens that lingered after the pointer left the page
		// would sit over the toolbar it was moving towards.
		delay: { open: settings?.delay ?? DEFAULT_DELAY, close: 0 },
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

		const client = { x: event.clientX, y: event.clientY }

		trackingRef.current = client

		// Only the open lens needs frame-local coordinates, and only it pays the layout read.
		if (!openRef.current) return

		const rect = event.currentTarget.getBoundingClientRect()

		setTracking({ local: { x: client.x - rect.left, y: client.y - rect.top }, client })
	}, [])

	/** Drops the tracked point: the pointer has left the scan, so there is nothing to magnify. */
	const leave = useCallback(() => {
		trackingRef.current = null

		if (openRef.current) setTracking(null)
	}, [])

	/*
	 * Both bags are memoized, and `leave` is a callback rather than a literal, because they are
	 * dependencies of the result below. An inline handler — or a bare `getReferenceProps()` call
	 * — allocates on every render, which would defeat that memo and, through it, the context
	 * memo in `usePdfViewer`. The floating-ui getters are stable until an interaction's own
	 * inputs move, so these hold across every render that leaves the lens alone.
	 */
	const referenceProps = useMemo(
		() =>
			enabled
				? getReferenceProps({ onPointerEnter: track, onPointerMove: track, onPointerLeave: leave })
				: EMPTY_PROPS,
		[enabled, getReferenceProps, track, leave],
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
		}, settings?.delay ?? DEFAULT_DELAY)
	}, [locate, settings?.delay])

	/*
	 * Every scroller, through one listener.
	 *
	 * A scroll event does not bubble, so a handler on the viewer's own viewport hears only the
	 * pans the reader makes inside it. The page moves under the lens just as far when the
	 * scroller is a drawer around the viewer or the document itself, and neither of those
	 * reaches a prop on the viewport. Caught on the way down instead, where every scroll in the
	 * document passes through — {@link handlePan} answers for the cost of that.
	 *
	 * A pending re-open does not outlive the loupe being switched off, so a reader who turns it
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

			handlePan()
		}

		document.addEventListener('scroll', handleScroll, true)

		return () => {
			document.removeEventListener('scroll', handleScroll, true)

			window.clearTimeout(settleRef.current)
		}
	}, [enabled, handlePan])

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
			setReference: refs.setReference,
			setFloating: refs.setFloating,
			floatingStyles,
		}),
		[enabled, open, tracking, referenceProps, floatingProps, refs, floatingStyles],
	)
}

/** One identity for "this hook contributes nothing", so a disabled loupe is memo-stable too. */
const EMPTY_PROPS: Record<string, unknown> = {}
