import { describe, expect, it, vi } from 'vitest'
import {
	Collapse,
	CollapsePanel,
	CollapseTrigger,
	useCollapseContext,
} from '../../components/collapse'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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
