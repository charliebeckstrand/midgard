import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, expect } from 'vitest'
import './tailwind.css'

/**
 * Browser-suite setup. Registers the axe and jest-dom matchers and tears down
 * the DOM between cases. No `matchMedia` / `ResizeObserver` stubs; the real
 * engine provides them.
 */
expect.extend(toHaveNoViolations)

afterEach(() => {
	cleanup()
})
