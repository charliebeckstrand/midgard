import { describe, expect, it } from 'vitest'
import { createSlot } from '../../core/create-slot'
import { bySlot, renderUI, screen } from '../helpers'

describe('createSlot', () => {
	it('renders the requested intrinsic element with data-slot', () => {
		const Body = createSlot('div', 'card-body')

		const { container } = renderUI(<Body>content</Body>)

		const el = bySlot(container, 'card-body')

		expect(el).toBeInTheDocument()
		expect(el?.tagName).toBe('DIV')
	})

	it('honors the requested tag', () => {
		const Term = createSlot('dt', 'dl-term')

		const { container } = renderUI(<Term>name</Term>)

		const el = bySlot(container, 'dl-term')

		expect(el?.tagName).toBe('DT')
	})

	it('composes recipe classes with the caller className', () => {
		const Body = createSlot('div', 'card-body', 'p-4', 'rounded-md')

		const { container } = renderUI(<Body className="bg-red">x</Body>)

		const el = bySlot(container, 'card-body')

		expect(el?.className).toContain('p-4')
		expect(el?.className).toContain('rounded-md')
		expect(el?.className).toContain('bg-red')
	})

	it('lets caller className win tailwind conflicts (appended last)', () => {
		const Body = createSlot('div', 'card-body', 'p-4')

		const { container } = renderUI(<Body className="p-8">x</Body>)

		const el = bySlot(container, 'card-body')

		expect(el?.className).toContain('p-8')
		expect(el?.className).not.toContain('p-4')
	})

	it('renders children', () => {
		const Body = createSlot('div', 'card-body')

		renderUI(<Body>Hello</Body>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})

	it('forwards arbitrary props', () => {
		const Body = createSlot('div', 'card-body')

		const { container } = renderUI(
			<Body id="my-body" aria-label="region" data-testid="x">
				x
			</Body>,
		)

		const el = bySlot(container, 'card-body')

		expect(el).toHaveAttribute('id', 'my-body')
		expect(el).toHaveAttribute('aria-label', 'region')
		expect(el).toHaveAttribute('data-testid', 'x')
	})

	it('sets displayName from the slot name', () => {
		const Body = createSlot('div', 'card-body')

		expect(Body.displayName).toBe('card-body')
	})

	it('works with no recipe classes', () => {
		const Empty = createSlot('div', 'tab-panels')

		const { container } = renderUI(<Empty className="custom">x</Empty>)

		const el = bySlot(container, 'tab-panels')

		expect(el?.className).toContain('custom')
	})
})
