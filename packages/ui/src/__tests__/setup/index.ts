import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

import './tanstack-virtual-core-teardown'
import './jsdom-stubs'

afterEach(() => {
	cleanup()
})
