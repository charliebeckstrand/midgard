'use client'

import {
	type ElementProps,
	type FloatingRootContext,
	safePolygon,
	useClick,
	useFocus,
	useHover,
	useInteractions,
} from '@floating-ui/react'
import {
	useCallback,
	useEffect,
	useId,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { type FloatingPlacement, useFloatingDisclosure } from '../../hooks'
import { useOpenChange } from '../../hooks/use-open-change'
import { useStableEvent } from '../../hooks/use-stable-event'
import { subscribeOverlaySignal } from '../../primitives/overlay'
import type { TooltipProps } from './tooltip'
import type { TooltipIntent } from './tooltip-intent'
import { isReferenceDisabled, observeReferenceDisabled } from './tooltip-reference-disabled'

/** Options for {@link useTooltipState}. @internal */
export type TooltipStateOptions = {
	placement?: FloatingPlacement
	trigger?: TooltipProps['trigger']
	delay?: number
	interactive?: boolean
	enabled?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
	/**
	 * Gives the intent that the trigger recorded before this state loaded, and
	 * removes the listeners that recorded it. The state calls it one time, when
	 * it holds the trigger node.
	 */
	takeIntent?: () => TooltipIntent
}

const noop = () => {}

/**
 * Opens the tooltip for the intent that the trigger recorded before the state
 * loaded. A click or a keyboard focus opens it at once. A hover opens it at the
 * end of the open delay, which counts from the start of the hover, so the load
 * does not add to the delay. The hover replay stops when the pointer leaves or
 * when the open state changes another way.
 *
 * @returns A function that stops a hover replay, or `undefined`.
 */
function replayIntent(
	intent: TooltipIntent,
	reference: Element,
	context: FloatingRootContext,
	setOpen: (open: boolean) => void,
	delay: number,
): (() => void) | undefined {
	if (intent.reenabled && reference.matches(':hover')) {
		setOpen(true)

		return
	}

	if (intent.click) {
		context.onOpenChange(true, intent.click, 'click')

		return
	}

	if (intent.focus && reference.contains(reference.ownerDocument.activeElement)) {
		context.onOpenChange(true, intent.focus, 'focus')

		return
	}

	const { hover } = intent

	if (!hover || context.open) return

	const timer = window.setTimeout(
		() => context.onOpenChange(true, hover.event, 'hover'),
		Math.max(0, hover.at + delay - performance.now()),
	)

	const stop = () => {
		window.clearTimeout(timer)

		reference.removeEventListener('pointerleave', stop)

		context.events.off('openchange', stop)
	}

	reference.addEventListener('pointerleave', stop)

	context.events.on('openchange', stop)

	return stop
}

/**
 * Floating, hover/focus/click interaction, and disabled-suppression state for
 * {@link Tooltip}, returned as the value shared through context.
 *
 * @remarks `trigger` selects hover or click, and keyboard focus opens with either.
 * A hover trigger opens on a mouse or pen hover only, so a tap does not open it.
 * Closes on the shared overlay-close signal and stays suppressed while the
 * reference (or a descendant) matches `:disabled`, re-opening on hover once the
 * disabled state clears. Hands the floating root context out as
 * `floatingContext`, which the focus manager of an `interactive`
 * `<TooltipContent>` mounts on.
 * @internal
 * @see {@link isReferenceDisabled}
 * @see {@link useFloatingDisclosure}
 */
export function useTooltipState({
	placement = 'top',
	trigger = 'hover',
	delay = 250,
	interactive = false,
	enabled = true,
	open: held = false,
	onOpenChange,
	takeIntent,
}: TooltipStateOptions) {
	// Whether the panel holds a tabbable control. `<TooltipContent>` reports it,
	// as `<PopoverContent>` reports its role to `<Popover>`.
	const [tabbable, setTabbable] = useState(false)

	const dialog = interactive && tabbable

	// The open state that hover, focus, and click ask for. The `open` option,
	// `held` here, shows the tooltip open over it: a programmatic reveal that
	// skips the pointer, for a tooltip whose trigger can't take hover (an SVG
	// rule the keyboard drives). A release shows this state again. A disabled
	// tooltip never holds. The disclosure stays controlled through a hold and a
	// release, because a controllable that took a value stays controlled.
	const [requested, setRequested] = useState(false)

	const { open, setOpen, refs, floatingStyles, context, dismiss, role } = useFloatingDisclosure({
		role: dialog ? 'dialog' : 'tooltip',
		placement,
		offset: 8,
		open: (enabled && held) || requested,
		onOpenChange: setRequested,
		gate: (next, gateRefs) =>
			!next || (enabled && !isReferenceDisabled(gateRefs.reference.current)),
	})

	// Adjusted during render: a tooltip that turns off while open closes in the
	// same render.
	const [prevEnabled, setPrevEnabled] = useState(enabled)

	if (prevEnabled !== enabled) {
		setPrevEnabled(enabled)

		if (!enabled && open) setOpen(false)
	}

	// Whether the reference matches `:disabled`, read from the DOM as an external
	// store. The reference's own `disabled` attribute, a child's, or an ancestor
	// `<fieldset disabled>` can set it, and none of them is a React signal. The
	// store subscribes to each of them, so a consumer that memoizes the tooltip,
	// as the React Compiler does, still sees the change.
	const domReference = context.elements.domReference

	const subscribeDisabled = useCallback(
		(onChange: () => void) =>
			domReference ? observeReferenceDisabled(domReference, onChange) : () => {},
		[domReference],
	)

	const disabled = useSyncExternalStore(
		subscribeDisabled,
		() => isReferenceDisabled(domReference),
		() => false,
	)

	// A trigger that turns disabled closes its tooltip.
	useEffect(() => {
		if (disabled && open) setOpen(false)
	}, [disabled, open, setOpen])

	// A trigger that turns enabled again under the pointer opens it once more, as
	// a hover would have.
	const wasDisabledRef = useRef(disabled)

	useEffect(() => {
		const wasDisabled = wasDisabledRef.current

		wasDisabledRef.current = disabled

		if (wasDisabled && !disabled && domReference?.matches(':hover')) setOpen(true)
	}, [disabled, domReference, setOpen])

	useEffect(() => {
		if (!open) return

		return subscribeOverlaySignal(() => setOpen(false))
	}, [open, setOpen])

	/*
	 * Watched rather than wrapped around the disclosure's setter. The open state on
	 * screen is derived: `held` or the requested state. A hover off a held tooltip
	 * changes the requested state but not the screen, so a report of the request
	 * would announce a close that never happened. The committed value reports exactly
	 * what the reader sees, on every route into it. Those routes are hover, focus,
	 * click, `held`, `enabled`, the `:disabled` store above, and the overlay signal.
	 */
	useOpenChange(open, onOpenChange)

	// `mouseOnly` reads the `pointerType` of the event, not a media query. A touch
	// press gives no hover, so a tap does not open a hover tooltip. The
	// `:focus-visible` gate of `useFocus` stops the focus that a tap gives a
	// button from opening it.
	const hover = useHover(context, {
		enabled: enabled && trigger === 'hover',
		mouseOnly: true,
		delay: { open: delay, close: 100 },
		// A bare `safePolygon()` takes floating-ui's defaults, and `requireIntent`
		// is one of them. It reads cursor speed: a traverse slower than 0.1 px/ms
		// reads as unintentional and closes the tooltip on a 40 ms timer — the one
		// case an interactive tooltip most wants to survive. The dial, if a careful
		// cursor ever reads as closing, is `{ requireIntent: false, buffer: 2 }`;
		// `buffer` defaults to 0.5.
		...(interactive && { handleClose: safePolygon() }),
	})

	const click = useClick(context, { enabled: enabled && trigger === 'click' })

	const focus = useFocus(context, { enabled })

	// The trigger names the dialog. `<TooltipTrigger>` stamps this id on the
	// trigger when the trigger has no id of its own, so the label reads the id
	// from the node.
	const generatedTriggerId = useId()

	const triggerId = dialog ? domReference?.id || generatedTriggerId : undefined

	const label = useMemo<ElementProps>(
		() => (triggerId ? { floating: { 'aria-labelledby': triggerId } } : {}),
		[triggerId],
	)

	const { getReferenceProps, getFloatingProps } = useInteractions([
		hover,
		click,
		focus,
		dismiss,
		role,
		label,
	])

	// The trigger hands its node to this state on the render after the state
	// loads. The intent of the reader before that moment opens the tooltip as
	// the node arrives, after the engine holds it, so the disabled gate reads
	// it. The first node takes the intent, and a later node finds none. The
	// replay is a stable event, so `setReference` keeps one identity and the
	// trigger does not attach its ref again on each render. A trigger can attach
	// in the commit that mounts the state, before the layout effects of this
	// hook run, and the stable event already holds the handler of that commit.
	const replay = useStableEvent((reference: Element) =>
		takeIntent ? replayIntent(takeIntent(), reference, context, setOpen, delay) : undefined,
	)

	const stopReplayRef = useRef<(() => void) | undefined>(undefined)

	const { setReference: setEngineReference } = refs

	const setReference = useCallback(
		(node: HTMLElement | null) => {
			setEngineReference(node)

			if (!node || stopReplayRef.current) return

			stopReplayRef.current = replay(node) ?? noop
		},
		[setEngineReference, replay],
	)

	useEffect(() => () => stopReplayRef.current?.(), [])

	return useMemo(
		() => ({
			open,
			interactive,
			enabled,
			setReference,
			setFloating: refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			floatingContext: context,
			triggerId: dialog ? generatedTriggerId : undefined,
			reportTabbable: setTabbable,
		}),
		[
			dialog,
			generatedTriggerId,
			open,
			interactive,
			enabled,
			setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			context,
		],
	)
}
