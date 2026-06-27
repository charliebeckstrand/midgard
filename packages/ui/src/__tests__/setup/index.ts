import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { __resetAnnouncer } from '../../core/announcer'

import './tanstack-virtual-core-teardown'
import './jsdom-stubs'

afterEach(() => {
	cleanup()

	// The announcer's live region lives on document.body, outside React's tree;
	// cleanup() won't remove it. `__resetAnnouncer` clears it between tests.
	__resetAnnouncer()
})
