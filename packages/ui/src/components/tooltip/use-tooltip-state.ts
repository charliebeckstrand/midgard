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
import { contains } from '@floating-ui/react/utils'
import {
	type FocusEvent as ReactFocusEvent,
	useCallback,
	useEffect,
	useId,
	useLayoutEffect,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
} from 'react'
import { useFloatingDisclosure } from '../../hooks/use-floating-disclosure'
import { useReportedChange } from '../../hooks/use-reported-change'
import { useStableEvent } from '../../hooks/use-stable-event'
import { subscribeOverlaySignal } from '../../primitives/overlay/overlay-signal'
import { noop, noopSubscribe } from '../../utilities/noop'
import { type TooltipContextValue, useTooltipGroup } from './context'
import type { TooltipProps } from './tooltip'
import { isReferenceDisabled, observeReferenceDisabled } from './tooltip-reference-disabled'
import {
	hoverOpens,
	isTooltipOpen,
	lastInputWasTouch,
	reopensOnEnable,
	type TooltipIntent,
} from './use-tooltip-intent'

/** Options for {@link useTooltipState}. @internal */
export type TooltipStateOptions = Pick<
	TooltipProps,
	'placement' | 'trigger' | 'delay' | 'interactive' | 'open' | 'onOpenChange'
> & {
	enabled?: boolean
	/**
	 * Gives the intent that the trigger recorded before this state loaded, and
	 * removes the listeners that recorded it. The state calls it one time, when
	 * it holds the trigger node.
	 */
	takeIntent?: () => TooltipIntent
}

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

	// The root of the trigger gives its active element in a shadow tree too,
	// where the document gives the shadow host.
	const root = reference.getRootNode() as Node & DocumentOrShadowRoot

	if (intent.focus && reference.contains(root.activeElement)) {
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
 * The state that {@link useTooltipState} gives: the value shared through
 * context, and the parts of its open state that {@link isTooltipOpen} reads
 * besides the props. @internal
 */
export type TooltipState = {
	value: TooltipContextValue
	requested: boolean
	heldDisabled: boolean
}

/**
 * Floating, hover/focus/click interaction, and disabled-suppression state for
 * {@link Tooltip}, with the value shared through context.
 *
 * @remarks `trigger` selects hover or click, and keyboard focus opens with either.
 * A hover trigger opens on a mouse or pen hover only, so a tap does not open it.
 * Closes on the shared overlay-close signal and stays suppressed while the
 * reference (or a descendant) matches `:disabled`. A hover trigger opens again
 * under a mouse or pen hover once the disabled state clears. Hands the floating
 * root context out as `floatingContext`, which the focus manager of an
 * `interactive` `<TooltipContent>` mounts on.
 *
 * In a `<TooltipGroup>`, a tooltip opens with no delay while the group is warm,
 * and its panel then shows with no entrance. A tooltip that a sibling closes
 * removes its panel with no exit.
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
	// tooltip never holds, and a `:disabled` trigger releases the hold until it
	// turns enabled again. The disclosure stays controlled through a hold and a
	// release, because a controllable that took a value stays controlled.
	const [requested, setRequested] = useState(false)

	// The `:disabled` state of the trigger, held for the derivation of the open
	// state. The store below reads the trigger from the disclosure, so it comes
	// after it, and a render-time adjustment carries its value back here.
	const [heldDisabled, setHeldDisabled] = useState(false)

	// The `pointerType` of the last pointer event on the trigger. The intent
	// gives the type from before the state loaded.
	const pointerRef = useRef<string | null>(null)

	// The nearest `<TooltipGroup>`. While a tooltip of the group is open, or for
	// the grace period after it closes, the group is warm, and a hover opens
	// this tooltip with no delay. The store tells only a change of `warm`, so a
	// move from one sibling to the next renders no other tooltip.
	const group = useTooltipGroup()

	const warm = useSyncExternalStore(
		group?.subscribe ?? noopSubscribe,
		() => group?.warm() ?? false,
		() => false,
	)

	const openDelay = warm ? 0 : delay

	const { open, setOpen, refs, floatingStyles, context, dismiss, role } = useFloatingDisclosure({
		role: dialog ? 'dialog' : 'tooltip',
		placement,
		offset: 8,
		open: isTooltipOpen(enabled, held, requested, heldDisabled),
		onOpenChange: setRequested,
		// A hover opens the tooltip only for the pointer that the trigger recorded
		// (`hoverOpens`). The `mouseOnly` gate of `useHover` reads only the
		// pointer events after the state mounts. A tap that starts the state of a
		// tooltip that mounted before the load gives its pointer events first,
		// and then the compatibility mouse events, which that gate lets through.
		gate: (next, gateRefs, reason) => {
			if (!next) return true

			if (!enabled || isReferenceDisabled(gateRefs.reference.current)) return false

			return reason !== 'hover' || hoverOpens(pointerRef.current)
		},
	})

	// Whether the panel shows and goes with no animation. A tooltip that opens
	// in a warm group shows at once. A tooltip that closes because a sibling
	// opened goes at once, so the two panels do not overlap. Any other close
	// plays the exit. A render-time adjustment sets it in the render that
	// changes `open`, and the exit reads the value of that render.
	const [instant, setInstant] = useState(false)

	const [handedOver, setHandedOver] = useState(false)

	const [prevOpen, setPrevOpen] = useState(open)

	if (prevOpen !== open) {
		setPrevOpen(open)

		setInstant(open ? warm : handedOver)

		setHandedOver(false)
	}

	// Adjusted during render: a tooltip that turns off drops the request, so it
	// does not open again when it turns on. The open state is already closed in
	// this render.
	const [prevEnabled, setPrevEnabled] = useState(enabled)

	if (prevEnabled !== enabled) {
		setPrevEnabled(enabled)

		if (!enabled) setRequested(false)
	}

	// Whether the reference matches `:disabled`, read from the DOM as an external
	// store. The reference's own `disabled` attribute, a child's, or an ancestor
	// `<fieldset disabled>` can set it, and none of them is a React signal. The
	// store subscribes to each of them, so a consumer that memoizes the tooltip,
	// as the React Compiler does, still sees the change.
	const domReference = context.elements.domReference

	const subscribeDisabled = useCallback(
		(onChange: () => void) =>
			domReference ? observeReferenceDisabled(domReference, onChange) : noop,
		[domReference],
	)

	const disabled = useSyncExternalStore(
		subscribeDisabled,
		() => isReferenceDisabled(domReference),
		() => false,
	)

	// Adjusted during render: a trigger that turns disabled releases the hold in
	// the same render.
	if (heldDisabled !== disabled) setHeldDisabled(disabled)

	// A trigger that turns disabled closes its tooltip.
	useEffect(() => {
		if (disabled && open) setOpen(false)
	}, [disabled, open, setOpen])

	// Whether a mouse or pen hover is on the trigger, and no close ended it after
	// it started. The hover then has the tooltip open, or its open is pending. A
	// close such as Escape ends the hover, though the pointer stays.
	const hoverRef = useRef(false)

	useEffect(() => {
		if (!domReference) return

		// The reference can be an SVG node, and `Element` types its pointer
		// events as `Event`.
		const record = (event: Event) => {
			pointerRef.current = (event as PointerEvent).pointerType
		}

		const enter = (event: Event) => {
			record(event)

			hoverRef.current = hoverOpens(pointerRef.current)
		}

		const leave = () => {
			hoverRef.current = false
		}

		domReference.addEventListener('pointerenter', enter)
		domReference.addEventListener('pointerdown', record)
		domReference.addEventListener('pointerleave', leave)

		return () => {
			domReference.removeEventListener('pointerenter', enter)
			domReference.removeEventListener('pointerdown', record)
			domReference.removeEventListener('pointerleave', leave)
		}
	}, [domReference])

	useEffect(() => {
		const end = ({ open: next }: { open: boolean }) => {
			if (!next) hoverRef.current = false
		}

		context.events.on('openchange', end)

		return () => context.events.off('openchange', end)
	}, [context.events])

	// A trigger that turns enabled again under a mouse or pen opens a hover
	// tooltip once more, as a hover would have.
	const wasDisabledRef = useRef(disabled)

	useEffect(() => {
		const wasDisabled = wasDisabledRef.current

		wasDisabledRef.current = disabled

		if (
			wasDisabled &&
			!disabled &&
			reopensOnEnable({ enabled, trigger }, pointerRef.current) &&
			domReference?.matches(':hover')
		)
			setOpen(true)
	}, [disabled, domReference, enabled, trigger, setOpen])

	// A surface that opens hides the tooltip. When that surface closes, a hover
	// tooltip that the hover had open or pending opens again under a mouse or pen,
	// as the hover shows it. The pointer did not move, so no hover event comes to
	// open it. A touch browser keeps `:hover` on a tapped node, so the last
	// pointer type decides, as above.
	const reopenUnderHover = useStableEvent(() => {
		if (
			reopensOnEnable({ enabled, trigger }, pointerRef.current) &&
			domReference?.matches(':hover')
		)
			setOpen(true)
	})

	// The close goes through the floating context, also for a closed tooltip.
	// The `openchange` event then stops a pending hover open of `useHover` and of
	// the intent replay, so a click in the open delay does not show the tooltip
	// over the surface. `useHover` also ignores a pointer move on the trigger
	// until the pointer enters it again. The surface hides the hover, and does
	// not end it, so a second surface hides and restores the tooltip again. Only
	// a tooltip that a hover had open or pending opens again, so a tooltip that
	// the reader dismissed stays closed.
	const hideForSurface = useStableEvent(() => {
		const hovered = hoverRef.current

		context.onOpenChange(false)

		hoverRef.current = hovered

		return hovered ? reopenUnderHover : undefined
	})

	useEffect(() => subscribeOverlaySignal(hideForSurface), [hideForSurface])

	/*
	 * Watched rather than wrapped around the disclosure's setter. The open state on
	 * screen is derived: `held` or the requested state. A hover off a held tooltip
	 * changes the requested state but not the screen, so a report of the request
	 * would announce a close that never happened. The committed value reports exactly
	 * what the reader sees, on every route into it. Those routes are hover, focus,
	 * click, `held`, `enabled`, the `:disabled` store above, and the overlay signal.
	 */
	useReportedChange(open, onOpenChange)

	// A sibling that opens closes this tooltip. A held tooltip stays open, and
	// only its request drops.
	const handover = useStableEvent(() => {
		if (!isTooltipOpen(enabled, held, false, heldDisabled)) setHandedOver(true)

		context.onOpenChange(false)
	})

	// A layout effect, so the handover closes the sibling before the paint that
	// shows this panel.
	useLayoutEffect(() => (open && group ? group.open(handover) : undefined), [open, group, handover])

	// `mouseOnly` reads the `pointerType` of the event, not a media query. A touch
	// press gives no hover, so a tap does not open a hover tooltip. The
	// `:focus-visible` gate of `useFocus` stops the focus that a tap gives a
	// button from opening it. The touch gate below stops the rest.
	const hover = useHover(context, {
		enabled: enabled && trigger === 'hover',
		mouseOnly: true,
		delay: { open: openDelay, close: 100 },
		// Each hover tooltip keeps its panel open while the pointer travels from the
		// trigger onto it. The pointer can then rest on the content, as under a
		// screen magnifier (WCAG 2.2 SC 1.4.13). A bare `safePolygon()` takes the
		// defaults of floating-ui, and `requireIntent` is one of them. It reads the
		// speed of the cursor: a traverse slower than 0.1 px/ms reads as a drift, and
		// closes the tooltip on a 40 ms timer. The dial, if a careful cursor reads as
		// closing, is `{ requireIntent: false, buffer: 2 }`. `buffer` defaults to 0.5.
		handleClose: safePolygon(),
	})

	const click = useClick(context, { enabled: enabled && trigger === 'click' })

	const focusInteraction = useFocus(context, { enabled })

	// Focus that goes to an element outside the trigger and the panel closes the
	// tooltip in the task of the blur. `useFocus` closes only in a later task, so
	// that it can read the focus after a window blur. Until that task and its
	// render, the open panel stays over the new focus and can cover it (WCAG
	// 2.4.11). A hover panel also takes the pointer there. A blur with no next
	// element, or to a focus guard of the panel, still waits for `useFocus`. The
	// focus can then stay on the page or go into the panel. The close of
	// `useFocus` then finds the tooltip closed.
	const closeOnBlur = useStableEvent((event: ReactFocusEvent<Element>) => {
		const next = event.relatedTarget

		if (
			!(next instanceof Element) ||
			next.hasAttribute('data-floating-ui-focus-guard') ||
			contains(context.elements.domReference, next) ||
			contains(context.elements.floating, next)
		) {
			return
		}

		context.onOpenChange(false, event.nativeEvent, 'focus')
	})

	// A focus after a touch press does not open the tooltip, as in the intent
	// gate. `:focus-visible` alone lets it through in WebKit on iOS, where a tap
	// gives a button no focus: the focus that a closing dialog gives back to its
	// trigger then matches.
	const focus = useMemo<ElementProps>(() => {
		const { reference } = focusInteraction

		const onFocus = reference?.onFocus

		const onBlur = reference?.onBlur

		if (!onFocus || !onBlur) return focusInteraction

		return {
			...focusInteraction,
			reference: {
				...reference,
				onFocus: (event: ReactFocusEvent<Element>) => {
					if (!lastInputWasTouch()) onFocus(event)
				},
				onBlur: (event: ReactFocusEvent<Element>) => {
					onBlur(event)

					closeOnBlur(event)
				},
			},
		}
	}, [focusInteraction, closeOnBlur])

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
	const replay = useStableEvent((reference: Element) => {
		if (!takeIntent) return undefined

		const intent = takeIntent()

		pointerRef.current = intent.pointer

		hoverRef.current = intent.hover !== null

		// The options can change between the record and the replay.
		const reenabled = intent.reenabled && reopensOnEnable({ enabled, trigger }, intent.pointer)

		return replayIntent({ ...intent, reenabled }, reference, context, setOpen, openDelay)
	})

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

	const value = useMemo<TooltipContextValue>(
		() => ({
			open,
			instant,
			interactive,
			takesPointer: interactive || trigger === 'hover',
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
			instant,
			interactive,
			trigger,
			enabled,
			setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			context,
		],
	)

	return { value, requested, heldDisabled }
}
