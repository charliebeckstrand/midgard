import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, inject, vi } from 'vitest'
import { installSingletonResets } from '../helpers/reset-singletons'
import { installResidueGuard } from '../helpers/residue'

import './jsdom-stubs'
import './locale-guard'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// The waitFor/findBy budget is provided by vitest.config.ts, which owns the
// CI wall-clock headroom policy alongside testTimeout.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

// The `unit` project shares one jsdom window across every file a worker runs,
// which is the condition the browser suite's residue guard was written for.
// `cleanup()` removes the containers React owns and nothing else, so a node a
// case appended to the body outlives it. See `helpers/residue.ts` for the
// placement this registration depends on.
installResidueGuard()

// Registered before the `afterEach` below, whose `cleanup` then runs first.
installSingletonResets()

afterEach(() => {
	// Fifteen files install a fake clock, and a `finally` in a case restores it
	// when the body throws but not when the runner aborts the body at
	// `testTimeout`. The clock then leaks into the next case and, on a shared
	// worker, into the next file. `useRealTimers` is guarded internally, so this
	// is a no-op wherever no clock is installed, and no file in the package
	// installs one in a `beforeAll` that it means to outlive a case.
	vi.useRealTimers()

	cleanup()
})
