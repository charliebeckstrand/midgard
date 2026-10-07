'use client'

import { type ReactNode, useEffect, useSyncExternalStore } from 'react'
import type { ScaleStep } from '../../core/density'
import type { scale } from '../../recipes/kata/tooltip'
import { useTooltipContext } from './context'
import { preloadTooltipBody, readTooltipBody, subscribeTooltipBody } from './tooltip-body-loader'

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
	 * For the properties the panel's own entrance animates — `opacity` and
	 * `scale` — which `motion` writes as inline styles that no class can outrank.
	 * A caller that wants to fade a standing panel sets the fade here, where it
	 * composes with the entrance instead of fighting it.
	 */
	surfaceClassName?: string
	/**
	 * Opt the surface into the translucent glass chrome, as the panel family
	 * does. An ambient `<GlassProvider>` already turns it on; this is the
	 * per-surface opt-in for a tree that has none. Set `false` to keep the flat
	 * surface inside a `<GlassProvider>`.
	 *
	 * @defaultValue the ambient `<GlassProvider>` flag.
	 */
	glass?: boolean
	children: ReactNode
}

/** The server renders no panel: a tooltip is closed until a reader opens it. */
const serverTooltipBody = () => null

/**
 * Floating panel rendered when the enclosing `<Tooltip>` is open. Positions
 * via `<FloatingSurface>`, animates in, and adopts the glass surface from
 * `glass` or an active `<GlassProvider>`.
 *
 * @remarks The panel loads on demand. A hover or a focus on the trigger
 * starts the load of the panel module, which carries Motion and the floating
 * surface, and the panel opens when the module is there. The hover open delay
 * covers the load, so only a focus on the first tooltip of a page can show the
 * panel a fetch late. A page that opens no tooltip does not load Motion for it.
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
	const { open } = useTooltipContext()

	const body = useSyncExternalStore(subscribeTooltipBody, readTooltipBody, serverTooltipBody)

	useEffect(() => {
		if (open && !body) preloadTooltipBody()
	}, [open, body])

	return body && <body.TooltipBody {...props} />
}
