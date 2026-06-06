import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { toHaveNoViolations } from 'jest-axe'
import { afterEach, expect } from 'vitest'
import './tailwind.css'

/**
 * Browser-suite setup. Unlike the jsdom setup (setup/index.ts) there are no
 * matchMedia / ResizeObserver stubs — the real engine provides them. We only
 * register the axe and jest-dom matchers and tear down the DOM between cases.
 */
expect.extend(toHaveNoViolations)

afterEach(() => {
	cleanup()
})
