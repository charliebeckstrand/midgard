import { describe, expect, it } from 'vitest'
import { Concentric } from '../../components/concentric/component'
import { Radio, RadioField, RadioGroup } from '../../components/radio'
import { bySlot, renderUI, screen } from '../helpers'

describe('Radio', () => {
	it('renders with data-slot="radio"', () => {
		const { container } = renderUI(<Radio />)

		const el = bySlot(container, 'radio')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('INPUT')
	})

	it('renders as a radio input', () => {
		const { container } = renderUI(<Radio />)

		const el = bySlot(container, 'radio') as HTMLInputElement

		expect(el.type).toBe('radio')
	})

	it('applies custom className to the wrapper', () => {
		const { container } = renderUI(<Radio className="custom" />)

		const wrapper = bySlot(container, 'control')

		expect(wrapper?.className).toContain('custom')
	})

	it('renders a placeholder in skeleton mode', () => {
		const { container } = renderUI(<Radio />, { skeleton: true })

		expect(bySlot(container, 'radio')).not.toBeInTheDocument()
		expect(bySlot(container, 'placeholder')).toBeInTheDocument()
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Radio name="choice" value="a" />)

		const el = bySlot(container, 'radio') as HTMLInputElement

		expect(el.name).toBe('choice')

		expect(el.value).toBe('a')
	})
})

describe('RadioField', () => {
	it('renders with data-slot="field"', () => {
		const { container } = renderUI(<RadioField>content</RadioField>)

		const el = bySlot(container, 'field')

		expect(el).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<RadioField>Hello</RadioField>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<RadioField className="custom">content</RadioField>)

		const el = bySlot(container, 'field')

		expect(el?.className).toContain('custom')
	})
})

describe('RadioGroup', () => {
	it('renders with role="radiogroup"', () => {
		renderUI(<RadioGroup>content</RadioGroup>)

		expect(screen.getByRole('radiogroup')).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<RadioGroup>Hello</RadioGroup>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		renderUI(<RadioGroup className="custom">content</RadioGroup>)

		expect(screen.getByRole('radiogroup').className).toContain('custom')
	})
})

describe('Radio size', () => {
	it('defaults to md (size-4.5)', () => {
		const { container } = renderUI(<Radio />)

		expect(bySlot(container, 'control')?.className).toContain('size-4.5')
	})

	it('reflects an explicit size prop', () => {
		const { container } = renderUI(<Radio size="lg" />)

		expect(bySlot(container, 'control')?.className).toContain('size-5')
	})

	it('inherits size from <Concentric>', () => {
		const { container } = renderUI(
			<Concentric size="sm">
				<Radio />
			</Concentric>,
		)

		expect(bySlot(container, 'control')?.className).toContain('size-4')
	})

	it('indicator dot scales with size', () => {
		const { container } = renderUI(<Radio size="lg" />)

		expect(bySlot(container, 'radio-indicator')?.className).toContain('size-2')
	})
})
