import { MotionConfigContext } from 'motion/react'
import { use } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { renderUI } from '../helpers'

function Probe({ onConfig }: { onConfig: (config: object) => void }) {
	onConfig(use(MotionConfigContext))

	return null
}

describe('ReducedMotion', () => {
	it('sets reducedMotion to user for its descendants', () => {
		const onConfig = vi.fn()

		renderUI(
			<ReducedMotion>
				<Probe onConfig={onConfig} />
			</ReducedMotion>,
		)

		expect(onConfig).toHaveBeenLastCalledWith(expect.objectContaining({ reducedMotion: 'user' }))
	})

	// A nested root adds no second provider, so descendants read the outer
	// config object itself.
	it('reuses the config of an ancestor ReducedMotion', () => {
		const outer = vi.fn()

		const inner = vi.fn()

		renderUI(
			<ReducedMotion>
				<Probe onConfig={outer} />
				<ReducedMotion>
					<Probe onConfig={inner} />
				</ReducedMotion>
			</ReducedMotion>,
		)

		expect(inner.mock.lastCall?.[0]).toBe(outer.mock.lastCall?.[0])
	})
})
