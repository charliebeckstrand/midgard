import { describe, expect, it } from 'vitest'
import { Checklist, ChecklistItem } from '../../components/checklist'
import { allBySlot, bySlot, renderUI, screen } from '../helpers'

describe('Checklist', () => {
	it('renders with data-slot="checklist"', () => {
		const { container } = renderUI(
			<Checklist title="Setup">
				<ChecklistItem title="Step 1" />
			</Checklist>,
		)

		const el = bySlot(container, 'checklist')

		expect(el).toBeInTheDocument()

		expect(el?.tagName).toBe('DIV')
	})

	it('renders title and description', () => {
		renderUI(
			<Checklist title="Getting started" description="Finish these steps">
				<ChecklistItem title="One" />
			</Checklist>,
		)

		expect(screen.getByText('Getting started')).toBeInTheDocument()

		expect(screen.getByText('Finish these steps')).toBeInTheDocument()
	})

	it('derives completion summary from children', () => {
		renderUI(
			<Checklist title="Setup">
				<ChecklistItem complete title="One" />
				<ChecklistItem complete title="Two" />
				<ChecklistItem title="Three" />
			</Checklist>,
		)

		expect(screen.getByText('2 of 3')).toBeInTheDocument()
	})

	it('prefers explicit value and max over derived count', () => {
		renderUI(
			<Checklist title="Setup" value={5} max={10}>
				<ChecklistItem complete title="One" />
			</Checklist>,
		)

		expect(screen.getByText('5 of 10')).toBeInTheDocument()
	})

	it('marks the root data-complete when all items are done', () => {
		const { container } = renderUI(
			<Checklist title="Setup">
				<ChecklistItem complete title="One" />
				<ChecklistItem complete title="Two" />
			</Checklist>,
		)

		expect(bySlot(container, 'checklist')).toHaveAttribute('data-complete', 'true')
	})

	it('applies custom className', () => {
		const { container } = renderUI(
			<Checklist className="custom">
				<ChecklistItem title="One" />
			</Checklist>,
		)

		expect(bySlot(container, 'checklist')?.className).toContain('custom')
	})
})

describe('ChecklistItem', () => {
	it('renders with data-slot="checklist-item"', () => {
		const { container } = renderUI(
			<Checklist>
				<ChecklistItem title="One" />
			</Checklist>,
		)

		expect(bySlot(container, 'checklist-item')).toBeInTheDocument()
	})

	it('renders title, description, and actions', () => {
		renderUI(
			<Checklist>
				<ChecklistItem
					title="Create an account"
					description="Sign up with your email"
					actions={<button type="button">Start</button>}
				/>
			</Checklist>,
		)

		expect(screen.getByText('Create an account')).toBeInTheDocument()

		expect(screen.getByText('Sign up with your email')).toBeInTheDocument()

		expect(screen.getByRole('button', { name: 'Start' })).toBeInTheDocument()
	})

	it('marks complete items with data-complete="true"', () => {
		const { container } = renderUI(
			<Checklist>
				<ChecklistItem complete title="One" />
				<ChecklistItem title="Two" />
			</Checklist>,
		)

		const items = allBySlot(container, 'checklist-item')

		expect(items[0]).toHaveAttribute('data-complete', 'true')

		expect(items[1]).not.toHaveAttribute('data-complete')
	})
})
