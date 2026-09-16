import { describe, expect, it } from 'vitest'
import { ControlSkeleton } from '../../components/control/control-skeleton'
import { Group } from '../../components/group'
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

	it('draws the grouped silhouette inside a Group, from the stamp alone', () => {
		const { container: full } = renderUI(<ControlSkeleton />)

		// `<Group>` clones `data-group` onto every child. The skeleton derives the
		// joined shape from it rather than taking a boolean that echoes it.
		const { container: grouped } = renderUI(
			<Group>
				<ControlSkeleton />
			</Group>,
		)

		expect(bySlot(grouped, 'placeholder')?.className).not.toBe(
			bySlot(full, 'placeholder')?.className,
		)
	})

	it('forwards the stamp, so the join selectors reach the placeholder', () => {
		const { container } = renderUI(
			<Group orientation="vertical">
				<ControlSkeleton />
			</Group>,
		)

		const placeholder = bySlot(container, 'placeholder')

		expect(placeholder).toHaveAttribute('data-group', 'only')

		expect(placeholder).toHaveAttribute('data-group-orientation', 'vertical')
	})
})
