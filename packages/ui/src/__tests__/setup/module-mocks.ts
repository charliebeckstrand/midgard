import { vi } from 'vitest'

/**
 * Module mocks applied to every test file. Mocking globally (rather than
 * per-file) keeps the module graph consistent across the vmThreads pool —
 * a per-file mock can otherwise resolve inconsistently when `sequence.shuffle`
 * reorders worker loading.
 *
 * Tests that need a smarter mock (e.g. Calendar's inline header picker
 * delegates click-to-toggle to floating-ui) override locally via `vi.mock`
 * in the test file.
 */

vi.mock('@floating-ui/react', async () => (await import('../mocks/floating-ui')).default)
vi.mock('motion/react', async () => (await import('../mocks/motion-react')).default)
vi.mock('maplibre-gl', async () => (await import('../mocks/maplibre-gl')).default)
