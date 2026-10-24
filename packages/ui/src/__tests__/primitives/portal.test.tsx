import { describe, expect, it } from 'vitest'
import { Portal } from '../../primitives/portal'
import { renderUI, screen } from '../helpers'

describe('Portal', () => {
	it('writes only the documented attributes on its host', () => {
		renderUI(
			<Portal open>
				<span>surface</span>
			</Portal>,
		)

		const host = screen.getByText('surface').closest('[data-slot="portal"]')

		expect(host?.getAttributeNames().sort()).toEqual(['class', 'data-slot'])
	})
})
