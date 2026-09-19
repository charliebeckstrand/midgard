import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, expect } from 'vitest'
import { __resetAnnouncer } from '../../../core/announcer'
import './tailwind.css'

/**
 * Browser-suite setup. Registers the axe and jest-dom matchers and tears down
 * the DOM between cases. No `matchMedia` / `ResizeObserver` stubs; the real
 * engine provides them.
 */
expect.extend(toHaveNoViolations)

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. This project runs `isolate: false`, so one page
	// serves every file it runs and the region outlives its own file without
	// this. `setup/index.ts` resets it for the jsdom projects for the same reason.
	__resetAnnouncer()
})
