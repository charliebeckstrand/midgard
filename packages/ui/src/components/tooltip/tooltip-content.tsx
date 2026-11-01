'use client'

import type { ReactNode } from 'react'
import type { ScaleStep } from '../../core/density'
import { useIdlePreload } from '../../hooks/use-idle-preload'
import { useLazyModule } from '../../hooks/use-lazy-module'
import type { scale } from '../../recipes/kata/tooltip'
import { useTooltipTriggerContext } from './context'
import { tooltipBody } from './tooltip-body-loader'

/** Props for {@link TooltipContent}. */
export type TooltipContentProps = {
	/**
	 * The density step of the padding, the radius, and the text. Omit it to take
	 * the step of the nearest density scope of the trigger, which the portal
	 * carries. A step makes the panel a density scope.
	 */
	size?: ScaleStep<typeof scale>
	className?: string
	/**
	 * Class for the positioned wrapper around the panel, rather than for the panel
	 * itself.
	 *
	 * For the properties the panel's own entrance animates (`opacity` and
	 * `scale`), which `motion` writes as inline styles that no class can outrank.
	 * A caller that wants to fade a standing panel sets the fade here, where it
	 * composes with the entrance instead of fighting it.
	 */
	surfaceClassName?: string
	/**
	 * Opts the surface into the translucent glass chrome, as the panel family
	 * does. An ambient `<GlassProvider>` already turns it on; this is the
	 * per-surface opt-in for a tree that has none. Set `false` to keep the flat
	 * surface inside a `<GlassProvider>`.
	 *
	 * @defaultValue `false`, or the flag of the enclosing `<GlassProvider>`.
	 */
	glass?: boolean
	children: ReactNode
}

/**
 * Floating panel rendered when the enclosing `<Tooltip>` is open. Positions
 * via `<FloatingSurface>`, animates in, and adopts the glass surface from
 * `glass` or an active `<GlassProvider>`.
 *
 * @remarks The panel module carries the tooltip state, Motion, and the
 * floating surface, so the page does not load it before it hydrates. Each
 * mounted panel loads the module in idle time after the hydration, and the
 * panels share one load. A hover, a focus, or a click on the trigger starts the
 * load sooner, and the panel opens when the module is there. Thus a focus,
 * which opens with no delay, does not wait for the network after the idle load.
 *
 * Pointer events are disabled unless the tooltip is `interactive`,
 * so a non-interactive panel never intercepts hover. An `interactive` panel
 * that holds something tabbable joins the tab order of the trigger. Tab goes
 * from the trigger into the panel controls, and Tab after the last control
 * goes to the element after the trigger. Shift+Tab goes back the same way.
 * Focus does not stay in the panel, and the page stays visible to assistive
 * tech. When the tooltip closes from inside the panel, focus goes back to the
 * trigger. A prose panel that the pointer can only reach adds nothing to the
 * tab order.
 *
 * The same probe sets the role. An `interactive` panel that holds a tabbable
 * control is a non-modal `role="dialog"` without `aria-modal`, and the trigger
 * gives its name. Any other panel is a `role="tooltip"` that describes the
 * trigger.
 */
export function TooltipContent(props: TooltipContentProps) {
	const { open } = useTooltipTriggerContext()

	useIdlePreload(tooltipBody)

	const body = useLazyModule(tooltipBody, open)

	return body && <body.TooltipBody {...props} />
}
