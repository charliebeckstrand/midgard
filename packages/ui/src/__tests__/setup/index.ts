import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, inject } from 'vitest'
import { resetSingletons } from '../helpers/reset-singletons'

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

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. `__resetAnnouncer` clears it between tests.
	resetSingletons()
})
