import { beforeAll, vi } from 'vitest'
import { tooltipBody } from '../../../../components/tooltip/tooltip-body-loader'
import { loadMotionFeatures } from '../../../../primitives/reduced-motion/reduced-motion-features'

/**
 * floating-motion-project module mocks. `@floating-ui/react` and `motion/react`
 * are not mocked: this project checks the exit of a floating surface, which
 * needs the live focus engine and a real animation. The instant Motion mock
 * removes the surface in the commit that closes it, so no exit occurs. The
 * tooltip body loader gets the mock of the `floating-ui` project, so a tooltip
 * case behaves the same in each project.
 */
vi.mock('../../../../components/tooltip/tooltip-body-loader', async (importOriginal) =>
	(await import('../../../mocks/tooltip-body-loader')).default(importOriginal),
)

// The `motion` project loads the Motion features before its files for the
// reason that its setup gives.
await Promise.all([loadMotionFeatures('animation'), loadMotionFeatures('layout')])

// The `floating-ui` project loads the tooltip body before each file for the
// reason that its setup gives.
beforeAll(() => tooltipBody.load())
