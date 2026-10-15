'use client'

import { createLazyModule } from '../../utilities/lazy-module'

/**
 * The module of the tooltip body, which carries Motion and the floating
 * surface, in a chunk of its own. `TooltipContent` loads it in idle time after
 * the hydration, so a page with no tooltip does not load it. A hover or a focus
 * on a trigger loads it sooner, and the open delay of a hover covers the load.
 *
 * @remarks A load on intent that fails is an unhandled rejection, so the error
 * reaches the error reporting of the app. The idle load gives no error, and a
 * later intent reports it.
 * @internal
 */
export const tooltipBody = createLazyModule(() => import('./tooltip-body'))
