import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, inject } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'

import './jsdom-stubs'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// The waitFor/findBy budget is provided by vitest.base.config.ts, which owns
// the CI wall-clock headroom policy alongside testTimeout.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. `__resetAnnouncer` clears it between tests.
	__resetAnnouncer()
})
