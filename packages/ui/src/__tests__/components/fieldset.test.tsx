import { describe, expect, it } from 'vitest'
import {
	Description,
	ErrorMessage,
	Field,
	Fieldset,
	Label,
	Legend,
} from '../../components/fieldset'
import { bySlot, renderUI, screen } from '../helpers'

describe('Fieldset', () => {
	it('renders with data-slot="fieldset"', () => {
		const { container } = renderUI(<Fieldset>content</Fieldset>)

		const el = bySlot(container, 'fieldset')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('FIELDSET')
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Fieldset className="custom">content</Fieldset>)

		const el = bySlot(container, 'fieldset')

		expect(el?.className).toContain('custom')
	})

	it('passes through HTML attributes', () => {
		const { container } = renderUI(<Fieldset id="test">content</Fieldset>)

		const el = bySlot(container, 'fieldset')

		expect(el).toHaveAttribute('id', 'test')
	})
})

describe('Legend', () => {
	it('renders with data-slot="legend"', () => {
		const { container } = renderUI(
			<Fieldset>
				<Legend>Title</Legend>
			</Fieldset>,
		)

		expect(bySlot(container, 'legend')).toBeInTheDocument()

		expect(screen.getByText('Title')).toBeInTheDocument()
	})
})

describe('Field', () => {
	it('renders with data-slot="field"', () => {
		const { container } = renderUI(<Field>content</Field>)

		expect(bySlot(container, 'field')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<Field className="custom">content</Field>)

		const el = bySlot(container, 'field')

		expect(el?.className).toContain('custom')
	})
})

describe('Label', () => {
	it('renders with data-slot="label"', () => {
		const { container } = renderUI(<Label>Name</Label>)

		expect(bySlot(container, 'label')).toBeInTheDocument()

		expect(screen.getByText('Name')).toBeInTheDocument()
	})
})

describe('Description', () => {
	it('renders with data-slot="description"', () => {
		const { container } = renderUI(<Description>Help text</Description>)

		expect(bySlot(container, 'description')).toBeInTheDocument()

		expect(screen.getByText('Help text')).toBeInTheDocument()
	})
})

describe('ErrorMessage', () => {
	it('renders with data-slot="error"', () => {
		const { container } = renderUI(<ErrorMessage>Required</ErrorMessage>)

		expect(bySlot(container, 'error')).toBeInTheDocument()

		expect(screen.getByText('Required')).toBeInTheDocument()
	})
})
