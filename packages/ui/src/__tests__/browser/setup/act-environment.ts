/**
 * The browser suite runs in a real engine, where updates land outside any
 * `act()` scope by design: ResizeObserver and scroll callbacks fire for real
 * (ScrollArea, the virtualized tables), and the floating-ui project drives
 * components with real CDP events (`vitest/browser` userEvent). Tests await
 * outcomes with `waitFor` instead of simulating commits, so the act
 * environment RTL switches on suite-wide must come back off. RTL still
 * raises the flag around its own render/cleanup calls, so those remain
 * act-wrapped.
 */
import { beforeAll } from 'vitest'

declare global {
	var IS_REACT_ACT_ENVIRONMENT: boolean | undefined
}

// RTL raises the flag in a beforeAll it registers on import (from the shared
// setup, which loads first); this one registers after it and so runs after,
// lowering the flag for the suite.
beforeAll(() => {
	globalThis.IS_REACT_ACT_ENVIRONMENT = false
})
