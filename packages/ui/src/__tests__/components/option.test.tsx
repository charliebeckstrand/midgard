import { describe, expect, it } from 'vitest'
import { OptionCheckIcon } from '../../components/option'
import { bySlot, renderUI } from '../helpers'

describe('OptionCheckIcon', () => {
	it('renders an icon', () => {
		const { container } = renderUI(<OptionCheckIcon />)

		const el = bySlot(container, 'icon')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('svg')
	})

	it('is hidden until the option row is selected', () => {
		const { container } = renderUI(<OptionCheckIcon />)

		const cls = bySlot(container, 'icon')?.getAttribute('class') ?? ''

		expect(cls).toContain('hidden')

		expect(cls).toContain('group-data-selected/option:inline')
	})
})
