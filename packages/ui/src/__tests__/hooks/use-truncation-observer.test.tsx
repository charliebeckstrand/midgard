import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { __resetTruncationObserver, useTruncation } from '../../hooks/use-truncation'
import { type ResizeObserverStub, stubResizeObserver } from '../helpers/stub-resize-observer'

/**
 * The truncation observer is one per module, built from whichever
 * `ResizeObserver` is global at first use. The unit project shares one module
 * registry across a worker's files, so a stub that built it outlives the test
 * that installed the stub, unless the setup drops it.
 *
 * The two cases run in order. The first builds the observer from a stub. The
 * second arms a new label once Vitest has restored the global, and that label
 * must not land in the stub.
 */
function Label({ id }: { id: string }) {
	const [ref] = useTruncation<HTMLSpanElement>()

	return (
		<span ref={ref} data-testid={id}>
			label
		</span>
	)
}

describe('the shared truncation observer', { shuffle: false }, () => {
	let stubbed: ResizeObserverStub[] = []

	it('builds from a stubbed ResizeObserver', () => {
		stubbed = stubResizeObserver()

		// An earlier file in the worker can have built the observer already. The
		// global has moved now, so this drops that one, and the arm below builds
		// from the stub.
		__resetTruncationObserver()

		const { getByTestId } = render(<Label id="first" />)

		fireEvent.pointerOver(getByTestId('first'))

		expect(stubbed).toHaveLength(1)
	})

	it('measures through a fresh observer once the stub is gone', () => {
		const { getByTestId } = render(<Label id="second" />)

		const second = getByTestId('second')

		fireEvent.pointerOver(second)

		expect(stubbed[0]?.targets).not.toContain(second)
	})
})
