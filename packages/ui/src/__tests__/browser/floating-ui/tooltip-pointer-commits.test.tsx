import { Profiler, useRef } from 'react'
import { describe, expect, it } from 'vitest'
import { TooltipPointer } from '../../../components/tooltip/tooltip-pointer'
import { act, bySlot, present, renderUI, waitFor } from '../../helpers'
import { settledRect } from '../helpers/sample'

/** Props for {@link Readout}. */
type ReadoutProps = {
	/** The anchor point, relative to the origin, or in client coordinates. */
	point: { x: number; y: number }
	relative: boolean
	/** Called on each commit of the readout. */
	onCommit: () => void
}

/** An open readout at `point`, relative to an origin or in client coordinates. */
function Readout({ point, relative, onCommit }: ReadoutProps) {
	const origin = useRef<HTMLDivElement>(null)

	return (
		<Profiler id="readout" onRender={onCommit}>
			<div ref={origin} style={{ width: 400, height: 200, marginTop: 100 }} />

			<TooltipPointer open point={point} originRef={relative ? origin : undefined} track="point">
				<span>Readout</span>
			</TooltipPointer>
		</Profiler>
	)
}

/**
 * A pointer step of a readout takes one commit for the new point and one for
 * the position that floating-ui computes. The anchor keeps its identity and
 * reads the newest point. With a new anchor for each point, floating-ui stores
 * the new reference in state, which is a third commit.
 */
describe('tooltip pointer commits', () => {
	for (const relative of [true, false]) {
		it(`commits twice for a pointer step (${relative ? 'origin' : 'client'} point)`, async () => {
			const commits: number[] = []

			const onCommit = () => commits.push(1)

			const readout = (x: number) => (
				<Readout point={{ x, y: 80 }} relative={relative} onCommit={onCommit} />
			)

			const { rerender } = renderUI(readout(100))

			const panel = await waitFor(() =>
				present(bySlot(document.body, 'tooltip-content'), 'tooltip'),
			)

			await settledRect(panel)

			for (const x of [140, 180, 220]) {
				const start = commits.length

				const before = panel.getBoundingClientRect().left

				await act(async () => rerender(readout(x)))

				await waitFor(() => expect(panel.getBoundingClientRect().left).not.toBe(before))

				await settledRect(panel)

				expect(commits.length - start).toBe(2)
			}
		})
	}
})
