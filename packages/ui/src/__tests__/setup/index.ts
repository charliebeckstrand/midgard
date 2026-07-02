import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'

import './jsdom-stubs'

// waitFor/findBy budgets scale with the environment the same way the config's
// testTimeout does (vitest.base.config.ts): headroom decides when a wait
// passes, never whether it passes, so slower CI agents get more of it.
configure({ asyncUtilTimeout: process.env.CI ? 4_000 : 1_000 })

afterEach(() => {
	// withFakeTime restores real timers in its finally, but a test aborted by
	// testTimeout never runs that finally — without this backstop the leaked
	// fake clock cascades timeouts through every later test in the file.
	if (vi.isFakeTimers()) {
		vi.useRealTimers()
	}

	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. `__resetAnnouncer` clears it between tests.
	__resetAnnouncer()
})
