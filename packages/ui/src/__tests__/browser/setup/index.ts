import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, expect } from 'vitest'
import { resetSingletons } from '../../helpers/reset-singletons'
import { pageState } from './forensics'
import { absorbResidue, assertNoResidue } from './residue'
import './tailwind.css'

/**
 * Browser-suite setup. Registers the axe and jest-dom matchers and tears down
 * the DOM between cases. No `matchMedia` / `ResizeObserver` stubs; the real
 * engine provides them.
 */
expect.extend(toHaveNoViolations)

beforeEach(absorbResidue)

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

	// Last, so it reads what survived the teardown above rather than this
	// test's own render container.
	assertNoResidue()
})
