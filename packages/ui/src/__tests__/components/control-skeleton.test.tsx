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

	it('sizes from the explicit size prop', () => {
		const { container: md } = renderUI(<ControlSkeleton />)
		const { container: sm } = renderUI(<ControlSkeleton size="sm" />)

		expect(bySlot(md, 'placeholder')?.className).not.toBe(bySlot(sm, 'placeholder')?.className)
	})

	it('switches to the grouped silhouette with joined', () => {
		const { container: full } = renderUI(<ControlSkeleton />)
		const { container: joined } = renderUI(<ControlSkeleton joined />)

		expect(bySlot(joined, 'placeholder')?.className).not.toBe(
			bySlot(full, 'placeholder')?.className,
		)
	})
})
