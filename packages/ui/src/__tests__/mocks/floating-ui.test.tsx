import type * as FloatingUI from '@floating-ui/react'
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import floatingUIMock from './floating-ui'

/**
 * The mock merges the props of the interactions and the props of the caller
 * in the same order as the real `useInteractions`. A component that sets a prop
 * to win over an interaction, such as a trigger that clears the
 * `aria-describedby` of a tooltip, then acts the same in jsdom and in a real
 * browser.
 */
const actual = await vi.importActual<typeof FloatingUI>('@floating-ui/react')

type Interaction = { reference?: Record<string, unknown> }

/** The reference props of the real hook and of the mock, for the same input. */
function referenceProps(interactions: Interaction[], userProps: Record<string, unknown>) {
	const real = renderHook(() => actual.useInteractions(interactions)).result.current

	const mock = renderHook(() => floatingUIMock.useInteractions(interactions)).result.current

	return {
		real: real.getReferenceProps(userProps),
		mock: mock.getReferenceProps(userProps),
	}
}

describe('floating-ui mock: useInteractions', () => {
	it('lets a prop of the caller win over a prop of an interaction', () => {
		const { real, mock } = referenceProps([{ reference: { 'aria-describedby': 'tip' } }], {
			'aria-describedby': 'hint',
		})

		expect(real['aria-describedby']).toBe('hint')

		expect(mock['aria-describedby']).toBe(real['aria-describedby'])
	})

	it('lets an undefined prop of the caller clear a prop of an interaction', () => {
		const { real, mock } = referenceProps([{ reference: { 'aria-describedby': 'tip' } }], {
			'aria-describedby': undefined,
		})

		expect(real['aria-describedby']).toBeUndefined()

		expect(mock['aria-describedby']).toBeUndefined()
	})

	it('runs the handlers of the interactions before the handler of the caller', () => {
		const calls: string[] = []

		const interactions = [{ reference: { onClick: () => calls.push('interaction') } }]

		const userProps = { onClick: () => calls.push('caller') }

		const { real, mock } = referenceProps(interactions, userProps)

		;(real.onClick as () => void)()

		const realOrder = calls.splice(0)

		;(mock.onClick as () => void)()

		expect(realOrder).toEqual(['interaction', 'caller'])

		expect(calls).toEqual(realOrder)
	})
})
