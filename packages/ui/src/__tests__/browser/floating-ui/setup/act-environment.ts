/**
 * The floating-ui project drives components with real CDP events
 * (`vitest/browser` userEvent), whose React updates land outside any `act()`
 * scope by design — tests await outcomes with `waitFor` instead of simulating
 * commits. Importing @testing-library/react switches the act environment on
 * globally, making React warn on every real-event update; switch it back off.
 * RTL still raises the flag around its own render/cleanup calls, so those
 * remain act-wrapped.
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
