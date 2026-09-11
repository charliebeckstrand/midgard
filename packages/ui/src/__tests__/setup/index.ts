import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, inject } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'

import './locale-guard'

declare module 'vitest' {
	interface ProvidedContext {
		asyncUtilTimeout: number
	}
}

// The waitFor/findBy budget is provided by vitest.config.ts, which owns the
// CI wall-clock headroom policy alongside testTimeout.
configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

// A file that opens with `// @vitest-environment node` runs under this setup
// with no window: the pure-function suites declare it so they cannot reach
// the shared jsdom window (`pure-project-boundary.test.ts` holds that pair).
// Everything below needs a window, so it installs only where one exists.
if (typeof window !== 'undefined') {
	await import('./jsdom-stubs')

	afterEach(() => {
		cleanup()

		// The announcer's live region lives on document.body, outside React's
		// tree; cleanup() won't remove it. `__resetAnnouncer` clears it between
		// tests.
		__resetAnnouncer()
	})
}
