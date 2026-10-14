import { describe, expect, it } from 'vitest'
import { createSlot } from '../../core/create-slot'
import { bySlot, getSlot, renderUI, screen } from '../helpers'

describe('createSlot', () => {
	it.each([
		['div', 'card-body'],
		['dt', 'dl-term'],
	] as const)('renders the requested <%s> with data-slot="%s"', (tag, slot) => {
		const Slot = createSlot(tag, slot)

		const { container } = renderUI(<Slot>content</Slot>)

		expect(getSlot(container, slot).tagName).toBe(tag.toUpperCase())
	})

	it('composes recipe classes with the caller className', () => {
		const Body = createSlot('div', 'card-body', 'p-4', 'rounded-md')

		const { container } = renderUI(<Body className="bg-red">x</Body>)

		const body = bySlot(container, 'card-body')

		expect(body?.className).toContain('p-4')

		expect(body?.className).toContain('rounded-md')

		expect(body?.className).toContain('bg-red')
	})

	it('lets caller className win tailwind conflicts (appended last)', () => {
		const Body = createSlot('div', 'card-body', 'p-4')

		const { container } = renderUI(<Body className="p-8">x</Body>)

		const body = bySlot(container, 'card-body')

		expect(body?.className).toContain('p-8')

		expect(body?.className).not.toContain('p-4')
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

		const body = bySlot(container, 'card-body')

		expect(body).toHaveAttribute('id', 'my-body')

		expect(body).toHaveAttribute('aria-label', 'region')

		expect(body).toHaveAttribute('data-testid', 'x')
	})

	it('sets displayName from the slot name', () => {
		const Body = createSlot('div', 'card-body')

		expect(Body.displayName).toBe('card-body')
	})

	it('works with no recipe classes', () => {
		const Empty = createSlot('div', 'tab-panels')

		const { container } = renderUI(<Empty className="custom">x</Empty>)

		const panels = bySlot(container, 'tab-panels')

		expect(panels?.className).toContain('custom')
	})
})
