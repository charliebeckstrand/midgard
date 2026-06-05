import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, expect } from 'vitest'

import './tanstack-virtual-core-teardown'
import './jsdom-stubs'

expect.extend(toHaveNoViolations)

afterEach(() => {
	cleanup()
})
