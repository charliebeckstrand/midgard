import { MotionConfig, MotionConfigContext } from 'motion/react'
import { use, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ReducedMotion } from '../../primitives/reduced-motion'
import { ReducedMotionContext } from '../../primitives/reduced-motion/context'
import { renderUI } from '../helpers'

function Mounts({ onMount }: { onMount: () => void }) {
	useEffect(onMount, [onMount])

	return null
}

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
	it('sets reducedMotion to always when the Motion setting is reduced', () => {
		const onConfig = vi.fn()

		renderUI(
			<ReducedMotionContext value={true}>
				<ReducedMotion>
					<Probe onConfig={onConfig} />
				</ReducedMotion>
			</ReducedMotionContext>,
		)

		expect(onConfig).toHaveBeenLastCalledWith(expect.objectContaining({ reducedMotion: 'always' }))
	})

	// The setting changes a prop of the outermost root, not the shape of the
	// tree, so React keeps each subtree mounted. The `MotionConfig` of the app
	// sets the same value as the root while the setting is not reduced.
	it('keeps its subtree mounted when the Motion setting changes', () => {
		const onMount = vi.fn()

		const tree = (reduced: boolean) => (
			<MotionConfig reducedMotion="user">
				<ReducedMotionContext value={reduced}>
					<ReducedMotion>
						<ReducedMotion layout>
							<Mounts onMount={onMount} />
						</ReducedMotion>
					</ReducedMotion>
				</ReducedMotionContext>
			</MotionConfig>
		)

		const { rerender } = renderUI(tree(false))

		rerender(tree(true))

		rerender(tree(false))

		expect(onMount).toHaveBeenCalledTimes(1)
	})
})
