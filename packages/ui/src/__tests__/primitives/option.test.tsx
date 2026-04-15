import { describe, expect, it, vi } from 'vitest'
import { BaseOption, OptionDescription, OptionLabel } from '../../primitives'
import { renderUI, screen } from '../helpers'

describe('BaseOption', () => {
	it('renders with role="option"', () => {
		renderUI(
			<BaseOption selected={false} onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const el = screen.getByRole('option')

		expect(el).toBeInTheDocument()
	})

	it('sets aria-selected when selected', () => {
		renderUI(
			<BaseOption selected={true} onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const el = screen.getByRole('option')

		expect(el).toHaveAttribute('aria-selected', 'true')
	})

	it('sets aria-disabled when disabled', () => {
		renderUI(
			<BaseOption selected={false} disabled onSelect={() => {}}>
				Option
			</BaseOption>,
		)

		const el = screen.getByRole('option')

		expect(el).toHaveAttribute('aria-disabled', 'true')
	})

	it('calls onSelect on click', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		screen.getByRole('option').click()

		expect(onSelect).toHaveBeenCalledOnce()
	})

	it('does not call onSelect when disabled', () => {
		const onSelect = vi.fn()

		renderUI(
			<BaseOption selected={false} disabled onSelect={onSelect}>
				Option
			</BaseOption>,
		)

		screen.getByRole('option').click()

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('renders children', () => {
		renderUI(
			<BaseOption selected={false} onSelect={() => {}}>
				My Option
			</BaseOption>,
		)

		expect(screen.getByText('My Option')).toBeInTheDocument()
	})
})

describe('OptionLabel', () => {
	it('renders children', () => {
		renderUI(<OptionLabel>Label Text</OptionLabel>)

		expect(screen.getByText('Label Text')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<OptionLabel className="custom">Label</OptionLabel>)

		const el = container.querySelector('span')

		expect(el?.className).toContain('custom')
	})
})

describe('OptionDescription', () => {
	it('renders children', () => {
		renderUI(<OptionDescription>Desc Text</OptionDescription>)

		expect(screen.getByText('Desc Text')).toBeInTheDocument()
	})

	it('applies custom className', () => {
		const { container } = renderUI(<OptionDescription className="custom">Desc</OptionDescription>)

		expect(container.querySelector('.custom')).toBeInTheDocument()
	})
})
