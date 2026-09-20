import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, expect, inject, onTestFinished } from 'vitest'
import { resetSingletons } from '../../helpers/reset-singletons'
import { absorbResidue, assertNoResidue } from '../../helpers/residue'
import { pageState } from './forensics'
import './tailwind.css'

/**
 * Browser-suite setup. Registers the axe and jest-dom matchers, sets the
 * waitFor/findBy budget, and tears down the DOM between cases. No `matchMedia`
 * / `ResizeObserver` stubs; the real engine provides them.
 */
expect.extend(toHaveNoViolations)

// The budget is provided by vitest.browser.config.ts, which owns the CI
// wall-clock headroom policy alongside testTimeout. Without this the suite that
// does real layout ran at RTL's own 1s default on every machine, while the
// jsdom projects took 4s on CI.
declare module 'vitest' {
	interface ProvidedContext {
		slowFactor: number
	}
}

configure({ asyncUtilTimeout: inject('asyncUtilTimeout') })

beforeEach(() => {
	absorbResidue()

	// Registered here rather than called from the teardown below, so the check
	// reads what every other teardown left. The order is that `afterEach`, then
	// each test's own `onTestFinished` in reverse, then this one.
	onTestFinished(assertNoResidue)
})

afterEach((ctx) => {
	// Read before cleanup, so the dump describes the page the failing test left,
	// and only when there is a failure to explain: the runner sets the result
	// state before it calls this hook, so the 583 green tests of a clean run pay
	// nothing. A dump built for every test would force a layout flush on the
	// largest tree in the suite, 583 times, and discard all but one.
	if (ctx.task.result?.state === 'fail') console.error(`page state at failure:\n  ${pageState()}`)

	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. This project runs `isolate: false`, so one page
	// serves every file it runs and the region outlives its own file without
	// this. `setup/index.ts` resets it for the jsdom projects for the same reason.
	resetSingletons()
})
