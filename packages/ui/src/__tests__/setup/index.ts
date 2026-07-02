import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { hasReducedMotionListener, prefersReducedMotion } from 'motion-dom'
import { afterEach, beforeEach } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'

import './tanstack-virtual-core-teardown'
import './jsdom-stubs'

beforeEach(() => {
	// motion-dom initializes its reduced-motion matchMedia listener once per
	// module instance, and vmThreads caches node_modules per worker — so the
	// first test file's matchMedia state wins for every later file in that
	// worker, flaking motion-allowed tests. Resetting the singleton forces
	// framer-motion to re-read matchMedia under each test's own pin.
	prefersReducedMotion.current = null
	hasReducedMotionListener.current = false
})

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. `__resetAnnouncer` clears it between tests.
	__resetAnnouncer()
})
