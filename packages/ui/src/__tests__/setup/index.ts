import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, expect } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'

import './tanstack-virtual-core-teardown'
import './jsdom-stubs'

expect.extend(toHaveNoViolations)

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree,
	// so cleanup() won't remove it — reset it so messages don't leak between tests.
	__resetAnnouncer()
})
