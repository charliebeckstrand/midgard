import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach, inject, onTestFinished } from 'vitest'
import { resetSingletons } from '../helpers/reset-singletons'
import { absorbResidue, assertNoResidue } from '../helpers/residue'

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
beforeEach(() => {
	absorbResidue()

	onTestFinished(assertNoResidue)
})

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. `__resetAnnouncer` clears it between tests.
	resetSingletons()
})
