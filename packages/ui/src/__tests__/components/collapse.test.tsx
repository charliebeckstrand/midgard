import { describe, expect, it, vi } from 'vitest'
import {
	Collapse,
	CollapsePanel,
	CollapseTrigger,
	useCollapseContext,
} from '../../components/collapse'
import type { Mount } from '../../primitives/mount'
import { bySlot, fireEvent, renderUI, screen, userEvent } from '../helpers'

describe('Collapse', () => {
	it('renders panel when open', () => {
		renderUI(
			<Collapse defaultOpen>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Content</p>
				</CollapsePanel>
			</Collapse>,
		)

		expect(screen.getByText('Content')).toBeInTheDocument()
	})

	it('only references the panel via aria-controls while it is mounted', () => {
		renderUI(
			<Collapse>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Content</p>
				</CollapsePanel>
			</Collapse>,
		)

		const trigger = screen.getByText('Toggle')

		// Closed: the panel is unmounted, so the reference would dangle.
		expect(trigger).not.toHaveAttribute('aria-controls')

		fireEvent.click(trigger)

		const controls = trigger.getAttribute('aria-controls')

		expect(controls).toBeTruthy()

		expect(document.getElementById(controls as string)).not.toBeNull()
	})

	it('toggles open state on trigger click', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<Collapse onOpenChange={onOpenChange}>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Content</p>
				</CollapsePanel>
			</Collapse>,
		)

		fireEvent.click(screen.getByText('Toggle'))

		expect(onOpenChange).toHaveBeenCalledWith(true)
	})

	it('supports a controlled open state', () => {
		const { rerender } = renderUI(
			<Collapse open={false}>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Body</p>
				</CollapsePanel>
			</Collapse>,
		)

		rerender(
			<Collapse open={true}>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Body</p>
				</CollapsePanel>
			</Collapse>,
		)

		expect(screen.getByText('Body')).toBeInTheDocument()
	})

	it('renders without a built-in trigger when none is provided', () => {
		const { container } = renderUI(
			<Collapse defaultOpen>
				<p>Just body</p>
			</Collapse>,
		)

		expect(bySlot(container, 'collapse-trigger')).toBeNull()

		expect(screen.getByText('Just body')).toBeInTheDocument()
	})

	it('accepts a custom node in the compound trigger', () => {
		renderUI(
			<Collapse defaultOpen>
				<CollapseTrigger>
					<span>Custom Trigger</span>
				</CollapseTrigger>
				<CollapsePanel>
					<p>Body</p>
				</CollapsePanel>
			</Collapse>,
		)

		expect(screen.getByText('Custom Trigger')).toBeInTheDocument()
	})

	it('supports animate="slide"', () => {
		const { container } = renderUI(
			<Collapse animate="slide" defaultOpen>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Body</p>
				</CollapsePanel>
			</Collapse>,
		)

		expect(bySlot(container, 'collapse')).toBeInTheDocument()
	})

	it('supports animate={false}', () => {
		const { container } = renderUI(
			<Collapse animate={false} defaultOpen>
				<CollapseTrigger>Toggle</CollapseTrigger>
				<CollapsePanel>
					<p>Body</p>
				</CollapsePanel>
			</Collapse>,
		)

		expect(bySlot(container, 'collapse')).toBeInTheDocument()
	})

	describe('mount policy', () => {
		function Panel({ mount }: { mount?: Mount }) {
			return (
				<Collapse mount={mount}>
					<CollapseTrigger>Toggle</CollapseTrigger>
					<CollapsePanel>
						<input data-testid="field" defaultValue="" />
					</CollapsePanel>
				</Collapse>
			)
		}

		it('unmounts the closed panel by default, losing its state', async () => {
			const user = userEvent.setup({ delay: null })

			renderUI(<Panel />)

			await user.click(screen.getByText('Toggle'))

			await user.type(screen.getByTestId('field'), 'typed')

			await user.click(screen.getByText('Toggle'))

			expect(screen.queryByTestId('field')).not.toBeInTheDocument()

			await user.click(screen.getByText('Toggle'))

			expect(screen.getByTestId<HTMLInputElement>('field').value).toBe('')
		})

		it('mount="lazy" defers the panel, then holds its state across a close', async () => {
			const user = userEvent.setup({ delay: null })

			renderUI(<Panel mount="lazy" />)

			// Never opened, so never mounted.
			expect(screen.queryByTestId('field')).not.toBeInTheDocument()

			await user.click(screen.getByText('Toggle'))

			await user.type(screen.getByTestId('field'), 'typed')

			await user.click(screen.getByText('Toggle'))

			// Held, not unmounted — and hidden once the close animation lands.
			expect(screen.getByTestId('field')).toBeInTheDocument()

			expect(screen.getByTestId('field')).not.toBeVisible()

			await user.click(screen.getByText('Toggle'))

			expect(screen.getByTestId<HTMLInputElement>('field').value).toBe('typed')
		})

		it('mount="always" mounts the panel closed and hidden from the start', () => {
			renderUI(<Panel mount="always" />)

			expect(screen.getByTestId('field')).toBeInTheDocument()

			expect(screen.getByTestId('field')).not.toBeVisible()
		})

		it('holds the panel without motion when animate is false', async () => {
			const user = userEvent.setup({ delay: null })

			renderUI(
				<Collapse mount="always" animate={false}>
					<CollapseTrigger>Toggle</CollapseTrigger>
					<CollapsePanel>
						<input data-testid="field" defaultValue="" />
					</CollapsePanel>
				</Collapse>,
			)

			// No transition to wait on, so the hold applies on the toggle itself.
			expect(screen.getByTestId('field')).not.toBeVisible()

			await user.click(screen.getByText('Toggle'))

			expect(screen.getByTestId('field')).toBeVisible()
		})
	})
})

describe('useCollapseContext in trigger children', () => {
	function OpenLabel() {
		const { open } = useCollapseContext()

		return open ? 'Open!' : 'Closed'
	}

	it('exposes open=true to trigger children', () => {
		renderUI(
			<Collapse defaultOpen>
				<CollapseTrigger>
					<OpenLabel />
				</CollapseTrigger>
				<CollapsePanel>Body</CollapsePanel>
			</Collapse>,
		)

		expect(screen.getByText('Open!')).toBeInTheDocument()
	})

	it('exposes open=false when collapsed', () => {
		renderUI(
			<Collapse>
				<CollapseTrigger>
					<OpenLabel />
				</CollapseTrigger>
				<CollapsePanel>Body</CollapsePanel>
			</Collapse>,
		)

		expect(screen.getByText('Closed')).toBeInTheDocument()
	})

	it('forwards the user onClick after toggling', () => {
		const onClick = vi.fn()

		renderUI(
			<Collapse>
				<CollapseTrigger onClick={onClick}>Toggle</CollapseTrigger>
				<CollapsePanel>Body</CollapsePanel>
			</Collapse>,
		)

		fireEvent.click(screen.getByText('Toggle'))

		expect(onClick).toHaveBeenCalled()
	})
})

// Driven on the held branch: the mock resolves a landing only on an animate-target
// change, never on a mount (`mocks/motion-react.ts`), and an `active` panel enters by
// mounting. Holding it animates between two targets in place, which the mock does see.
describe('Collapse onOpenComplete', () => {
	const collapse = (props: { open: boolean; onOpenComplete: () => void }) => (
		<Collapse mount="always" onOpenChange={() => {}} {...props}>
			<CollapseTrigger>Toggle</CollapseTrigger>
			<CollapsePanel>Body</CollapsePanel>
		</Collapse>
	)

	const unanimated = (props: { open: boolean; onOpenComplete: () => void }) => (
		<Collapse animate={false} onOpenChange={() => {}} {...props}>
			<CollapsePanel>Body</CollapsePanel>
		</Collapse>
	)

	it('reports the landing once the panel is at its open height', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(collapse({ open: false, onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()

		rerender(collapse({ open: true, onOpenComplete }))

		expect(onOpenComplete).toHaveBeenCalledOnce()
	})

	it('says nothing for the close, which lands on the same handler', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(collapse({ open: false, onOpenComplete }))

		rerender(collapse({ open: true, onOpenComplete }))

		rerender(collapse({ open: false, onOpenComplete }))

		// The exit target lands too; the definition gate takes the enter and drops it.
		expect(onOpenComplete).toHaveBeenCalledOnce()
	})

	it('reports the open immediately when animate is false', () => {
		const onOpenComplete = vi.fn()

		const { rerender } = renderUI(unanimated({ open: false, onOpenComplete }))

		rerender(unanimated({ open: true, onOpenComplete }))

		expect(onOpenComplete).toHaveBeenCalledOnce()
	})

	it('says nothing for a panel that mounts already open', () => {
		const onOpenComplete = vi.fn()

		renderUI(unanimated({ open: true, onOpenComplete }))

		expect(onOpenComplete).not.toHaveBeenCalled()
	})
})
