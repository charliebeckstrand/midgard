import { createContext } from '../../core'
import type { Demo } from './routes'

/** The route a demo page renders under: its demo entry and active tab slug (`''` on the index tab). */
export type DemoRoute = { demo: Demo; tab: string }

// Provided by DemoPage around each routed demo; the route-driven tab components
// (DemoTabs, DemoTab, DemoTabPanel) read it to wire tabs to sub-routes without
// per-layout plumbing.
export const [DemoRouteContext, useDemoRoute] = createContext<DemoRoute | null>('DemoRoute', {
	default: null,
})
