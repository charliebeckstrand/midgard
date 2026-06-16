import { vi } from 'vitest'

/**
 * Module mocks applied to every test file. Global mocks keep the module graph
 * consistent across the vmThreads pool; per-file mocks for the same module can
 * resolve inconsistently when `sequence.shuffle` reorders worker loading.
 *
 * Tests that need a smarter mock override locally via `vi.mock` in the test
 * file (e.g. Calendar's inline header picker wiring click-to-toggle).
 */

vi.mock('@floating-ui/react', async () => (await import('../mocks/floating-ui')).default)

vi.mock('motion', async () => (await import('../mocks/motion')).default)

vi.mock('motion/react', async () => (await import('../mocks/motion-react')).default)

vi.mock('maplibre-gl', async () => (await import('../mocks/maplibre-gl')).default)
