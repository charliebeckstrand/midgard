'use client'

import {
	type ElementProps,
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
import { subscribeOverlaySignal } from '../../primitives/overlay'
import type { TooltipProps } from './tooltip'
import { preloadTooltipBody } from './tooltip-body-loader'

type TooltipStateOptions = {
	placement?: FloatingPlacement
	trigger?: TooltipProps['trigger']
	delay?: number
	interactive?: boolean
	enabled?: boolean
	open?: boolean
	onOpenChange?: (open: boolean) => void
}

/**
 * Starts the load of the panel module when a pointer enters the trigger or the
 * trigger takes focus. The hover open delay then covers the load. The
 * handlers chain with the handlers of the other interactions.
 */
const PRELOAD: ElementProps = {
	reference: { onPointerEnter: preloadTooltipBody, onFocus: preloadTooltipBody },
}

/**
 * Whether the floating reference is disabled. The reference node matches
 * `:disabled`, where the trigger is cloned onto a `<button>` switched off by
 * its own `disabled` attribute or an ancestor `<fieldset disabled>`. A
 * disabled control can also sit inside it (the wrapper-`<div>` fallback).
 * `querySelector` scans descendants only; `matches` covers the
 * reference-is-the-control case.
 */
function isReferenceDisabled(reference: unknown): boolean {
	return (
		reference instanceof Element &&
		(reference.matches(':disabled') || reference.querySelector(':disabled') !== null)
	)
}

/**
 * The `<fieldset>` ancestors of `reference`, nearest first. A `disabled` change
 * on any of them changes whether the reference matches `:disabled`.
 */
function fieldsetAncestors(reference: Element): Element[] {
	const fieldsets: Element[] = []

	for (let node = reference.parentElement?.closest('fieldset'); node; ) {
		fieldsets.push(node)

		node = node.parentElement?.closest('fieldset')
	}

	return fieldsets
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
}: TooltipStateOptions) {
	// The `open` option, `held` here, controls the disclosure open — a programmatic
	// reveal that skips the pointer, for a tooltip whose trigger can't take hover (an
	// SVG rule the keyboard drives). Left `undefined`, the disclosure stays
	// uncontrolled and hover / focus / click own it; a disabled tooltip never holds.
	// Whether the panel holds a tabbable control. `<TooltipContent>` reports it,
	// as `<PopoverContent>` reports its role to `<Popover>`.
	const [tabbable, setTabbable] = useState(false)

	const dialog = interactive && tabbable

	const { open, setOpen, refs, floatingStyles, context, dismiss, role } = useFloatingDisclosure({
		role: dialog ? 'dialog' : 'tooltip',
		placement,
		offset: 8,
		open: enabled && held ? true : undefined,
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
		(onChange: () => void) => {
			if (!domReference) return () => {}

			const observer = new MutationObserver(onChange)

			const watch = { attributes: true, attributeFilter: ['disabled'] }

			observer.observe(domReference, { ...watch, subtree: true })

			for (const fieldset of fieldsetAncestors(domReference)) observer.observe(fieldset, watch)

			return () => observer.disconnect()
		},
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
	 * Watched rather than wrapped around the disclosure's setter. `held` holds the
	 * disclosure controlled, and `useControllable` fires on every set, even the ones a
	 * controlled `open` then overrides. Hovering off a forced-open tooltip would therefore
	 * report a close that never happened. The committed value reports exactly what the
	 * reader sees, on every route into it. Those routes are hover, focus, click,
	 * `held`, `enabled`, the `:disabled` store above, and the overlay signal.
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
		PRELOAD,
	])

	return useMemo(
		() => ({
			open,
			interactive,
			enabled,
			setReference: refs.setReference,
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
			refs.setReference,
			refs.setFloating,
			floatingStyles,
			getReferenceProps,
			getFloatingProps,
			context,
		],
	)
}
