'use client'

import { type ReactNode, useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import type { FloatingPlacement } from '../../hooks'
import { TooltipContext, type TooltipContextValue } from './context'
import { preloadTooltipBody, readTooltipBody, subscribeTooltipBody } from './tooltip-body-loader'
import { useTooltipIntent } from './tooltip-intent'

/** Props for {@link Tooltip}. */
export type TooltipProps = {
	/**
	 * Preferred side/alignment of the content relative to the trigger; flips on collision.
	 * A `<side>-auto` value aligns the content to the edge of the trigger that is nearer to
	 * the edge of the viewport.
	 * @defaultValue 'top'
	 */
	placement?: FloatingPlacement
	/**
	 * What opens the tooltip. Keyboard focus opens it with each value.
	 *
	 * - `'hover'`: a mouse or pen hover. A tap does not open it, so a touch
	 *   screen shows no tooltip.
	 * - `'click'`: a click from any pointer, touch included. A mouse hover does
	 *   not open it. Use it when the tooltip must show on a touch screen, such
	 *   as an info button that a reader opens on purpose.
	 *
	 * @defaultValue 'hover'
	 * @remarks {@link TooltipProps.open} is the manual trigger.
	 */
	trigger?: 'hover' | 'click'
	/**
	 * Hover open delay in milliseconds (close delay is fixed at 100ms).
	 * @defaultValue 250
	 */
	delay?: number
	/**
	 * Keep the content open while the pointer travels into it (safe-polygon),
	 * letting users interact with its contents.
	 * @defaultValue false
	 * @remarks The travel must read as deliberate: a pointer that crosses slower
	 * than 0.1 px/ms reads as a drift and closes the content anyway.
	 *
	 * Content that holds a tabbable control makes the panel a non-modal
	 * `role="dialog"`, because a tooltip must not hold interactive content. The
	 * trigger names the dialog. The dialog is not modal: Tab goes from the
	 * trigger into the panel controls and then on to the element after the
	 * trigger, and the page stays visible to assistive tech. Prose content keeps
	 * `role="tooltip"`.
	 */
	interactive?: boolean
	/**
	 * Suppresses the tooltip and closes any open instance. The house polarity —
	 * every other surface spells suppression `disabled`.
	 * @defaultValue false
	 */
	disabled?: boolean
	/**
	 * Hold the tooltip open regardless of pointer, for a trigger that can't take
	 * hover — an SVG shape a roving keyboard cursor drives, say. Releasing it hands
	 * control back to hover / focus / click; `disabled` still wins.
	 * @defaultValue false
	 * @remarks `false` does not hold the tooltip closed. It only releases the hold,
	 * so a hover or a focus can still open the tooltip. Use `disabled` to keep it
	 * closed.
	 */
	open?: boolean
	/**
	 * Fires when the tooltip opens or closes, whatever drove it: the hover delay, focus,
	 * or a click on a `trigger="click"` tooltip. `open`, `disabled` going
	 * true, the trigger becoming `:disabled`, and the shared overlay-close signal also
	 * report here.
	 *
	 * Observation only. The tooltip owns its open state, and {@link TooltipProps.open}
	 * only holds it open. Hover cannot be driven from outside, so `open` does not pair
	 * with this callback as a controlled prop. Use this to mirror the state elsewhere,
	 * not to control it.
	 */
	onOpenChange?: (open: boolean) => void
	children: ReactNode
}

/** The server renders no tooltip state: the state loads on the client. */
const serverTooltipBody = () => null

/** A closed tooltip sets no styles on a panel, and no props on the trigger or the panel. */
const NO_STYLES = {}

const noProps = () => ({})

const noop = () => {}

/**
 * Hover/focus tooltip root; wires up floating state and shares `placement` and
 * `delay` with its `<TooltipTrigger>` and `<TooltipContent>` via context.
 *
 * @remarks Opens on hover or on click, as `trigger` selects, and on keyboard
 * focus. A tap does not open a hover tooltip; a tooltip that must show on a
 * touch screen takes `trigger="click"`. Stays
 * suppressed while the trigger is `:disabled` (own attribute, ancestor
 * `<fieldset disabled>`, or a disabled descendant) and dismisses on the shared
 * overlay-close signal. The panel takes `role="tooltip"`, and `<TooltipTrigger>`
 * puts `aria-describedby` on the trigger. An `interactive` panel that holds a
 * tabbable control is a non-modal `role="dialog"` that the trigger names. The
 * trigger then carries `aria-haspopup="dialog"`, `aria-expanded`, and
 * `aria-controls`.
 *
 * The floating state loads on demand, with the panel, so a page that only
 * shows a trigger does not load Floating UI before it is interactive.
 * `<TooltipContent>` schedules the load in idle time. Before the load, native
 * listeners on the trigger start the load on a hover, a focus, or a click,
 * and the state replays that intent when it takes over. A hover opens after
 * the same delay, a keyboard focus opens at once, and a click toggles. An
 * `open` tooltip starts the load at once.
 * @see {@link useTooltipState}
 */
export function Tooltip({ disabled, children, ...props }: TooltipProps) {
	// The module as the tooltip mounts. A tooltip that mounts after the load
	// runs the full state from its first render, so only a tooltip that mounts
	// before the load takes the light state and the handover. The choice holds
	// for the life of the tooltip, so the tree keeps its shape.
	const [module] = useState(readTooltipBody)

	// The public polarity is `disabled`; the state hook and floating-ui's own
	// hooks under it read `enabled`, so the inversion happens once, here.
	const enabled = !disabled

	return module ? (
		<module.TooltipStateRoot {...props} enabled={enabled}>
			{children}
		</module.TooltipStateRoot>
	) : (
		<LightTooltip {...props} enabled={enabled}>
			{children}
		</LightTooltip>
	)
}

/** Props for {@link LightTooltip}. */
type LightTooltipProps = Omit<TooltipProps, 'disabled'> & { enabled: boolean }

/**
 * A `<Tooltip>` that mounted before the state module loaded. It shares a
 * closed state and records the intent of the reader. When the module loads,
 * it renders `TooltipStateHost` beside its children and shares the value that
 * the host gives.
 */
function LightTooltip({ enabled, children, ...props }: LightTooltipProps) {
	const { trigger = 'hover', interactive = false, open: held = false } = props

	const module = useSyncExternalStore(subscribeTooltipBody, readTooltipBody, serverTooltipBody)

	// The value of the loaded state, which `TooltipStateHost` gives back.
	const [state, setState] = useState<TooltipContextValue | null>(null)

	const { setReference, takeIntent } = useTooltipIntent({ enabled, trigger })

	// A tooltip that `open` holds open needs its state now.
	useEffect(() => {
		if (enabled && held) preloadTooltipBody()
	}, [enabled, held])

	// Until the state loads, the tooltip is closed. The trigger gives its node to
	// the intent listeners.
	const light = useMemo<TooltipContextValue>(
		() => ({
			open: false,
			interactive,
			enabled,
			setReference,
			setFloating: noop,
			floatingStyles: NO_STYLES,
			getReferenceProps: noProps,
			getFloatingProps: noProps,
		}),
		[interactive, enabled, setReference],
	)

	// The host sits before the children, and both keep their places when the
	// host mounts, so the trigger does not mount again and keeps its focus.
	return (
		<TooltipContext value={state ?? light}>
			{module && (
				<module.TooltipStateHost
					{...props}
					enabled={enabled}
					takeIntent={takeIntent}
					onState={setState}
				/>
			)}
			{children}
		</TooltipContext>
	)
}
