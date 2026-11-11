import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { stateName, states } from '../pages/modules/map/data.ts'
import SelectAState from '../pages/modules/map/select-a-state.tsx'

// A state with no time zone row has no option in the select, so a click on it
// picks nothing. The map must not offer it as a click target.

function findRegion(container: HTMLElement, state: string) {
	const index = states.features.findIndex((feature) => stateName(feature) === state)

	return container.querySelector(`[data-region-index="${index}"]`)
}

describe('the Select a state example of Map', () => {
	it('gives a state with no time zone row no pointer cursor and no click hover', () => {
		const { container } = render(<SelectAState />)

		const alaska = findRegion(container, 'Alaska')

		expect(alaska?.getAttribute('class')).toContain('cursor-default')

		expect(alaska?.getAttribute('class')).not.toContain('hover:')

		expect(findRegion(container, 'Texas')?.getAttribute('class')).not.toContain('cursor-default')
	})
})
