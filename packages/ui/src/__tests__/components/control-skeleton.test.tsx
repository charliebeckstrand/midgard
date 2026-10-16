import { describe, expect, it } from 'vitest'
import { ControlSkeleton } from '../../components/control/control-skeleton'
import { bySlot, renderUI } from '../helpers'

// The explicit control placeholder: loading trees compose it where an Input,
// Combobox, Listbox, ColorPicker, or DatePicker will render.
describe('ControlSkeleton', () => {
	it('renders a placeholder line', () => {
		const { container } = renderUI(<ControlSkeleton />)

		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('writes an explicit size as its own density scope', () => {
		const { container: scoped } = renderUI(<ControlSkeleton />)

		const { container: sm } = renderUI(<ControlSkeleton size="sm" />)

		expect(bySlot(scoped, 'placeholder')).not.toHaveAttribute('data-density')

		expect(bySlot(sm, 'placeholder')).toHaveAttribute('data-density', 'sm')
	})
})
