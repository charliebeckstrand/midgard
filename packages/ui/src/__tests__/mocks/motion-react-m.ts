import { vi } from 'vitest'
import motionReact from './motion-react'

/**
 * `motion/react-m` mock applied globally via `setup/module-mocks.ts`.
 *
 * Each `m` element is the plain element of the `motion/react` mock for the same
 * tag, and `m.create` is its factory. The keys are the exports of the real
 * module, so a tag that the real module has is never missing here.
 */

const actual = await vi.importActual<typeof import('motion/react-m')>('motion/react-m')

const elements = motionReact.motion as Record<string, unknown>

export default Object.fromEntries(Object.keys(actual).map((tag) => [tag, elements[tag]]))
