import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, beforeEach, expect } from 'vitest'
import { resetSingletons } from '../../helpers/reset-singletons'
import { capturePageState, reportPageStateOnFailure } from './forensics'
import { absorbBodyResidue, assertNoBodyResidue } from './residue'
import { restoreViewportAfterFile } from './viewport'
import './tailwind.css'

/**
 * Browser-suite setup. Registers the axe and jest-dom matchers and tears down
 * the DOM between cases. No `matchMedia` / `ResizeObserver` stubs; the real
 * engine provides them.
 */
expect.extend(toHaveNoViolations)

beforeEach(() => {
	absorbBodyResidue()

	// Bound per test: `onTestFailed` needs a test context, and a green run
	// never calls it.
	reportPageStateOnFailure()
})

afterEach(() => {
	// Before cleanup, so a failure's dump describes the page the test left.
	capturePageState()

	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. This project runs `isolate: false`, so one page
	// serves every file it runs and the region outlives its own file without
	// this. `setup/index.ts` resets it for the jsdom projects for the same reason.
	resetSingletons()

	// Last, so it reads what survived the teardown above rather than this
	// test's own render container.
	assertNoBodyResidue()
})

restoreViewportAfterFile()
