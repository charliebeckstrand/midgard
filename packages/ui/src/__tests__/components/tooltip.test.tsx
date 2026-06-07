import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../components/tooltip'
import { TooltipContext } from '../../components/tooltip/context'
import { notifyOverlaySignal } from '../../primitives/overlay'
import { act, bySlot, renderUI, screen, userEvent, waitFor } from '../helpers'

// The global floating-ui mock stubs useRole/useFocus to {} and only forwards
// onClick through getReferenceProps, so the tooltip's role/focus/aria wiring is
// invisible to the jsdom suite. Override it locally with a mock that models the
// pieces this file exercises: useRole's tooltip aria-describedby + panel id/role,
// useFocus opening on focus, and getReferenceProps/getFloatingProps merging every
// reference/floating prop (composing handlers) rather than only onClick.
vi.mock('@floating-ui/react', async () => {
	const base = (await import('../mocks/floating-ui')).default

	const FLOATING_ID = 'tooltip-fui-id'

	type Props = Record<string, unknown>
	type Context = { open?: boolean; onOpenChange?: (open: boolean) => void }
	type Interaction = { reference?: Props; floating?: Props }

	const mergeProps = (list: (Props | undefined)[]): Props => {
		const out: Props = {}

		for (const props of list) {
			if (!props) continue

			for (const [key, value] of Object.entries(props)) {
				if (typeof value === 'function') {
					const prev = out[key] as ((...args: unknown[]) => void) | undefined
					const next = value as (...args: unknown[]) => void

					out[key] = prev
						? (...args: unknown[]) => {
								prev(...args)
								next(...args)
							}
						: next
				} else if (value !== undefined) {
					out[key] = value
				}
			}
		}

		return out
	}

	return {
		...base,
		useRole: (context: Context, props?: { role?: string }) => ({
			reference: { 'aria-describedby': context?.open ? FLOATING_ID : undefined },
			floating: { id: FLOATING_ID, role: props?.role ?? 'tooltip' },
		}),
		// Open-only on both focus and click: userEvent.click fires focus *then*
		// click, so a toggling click would re-close what focus just opened. No
		// test here exercises click-to-close (dismissal goes through the overlay
		// signal), so open-only keeps the focus + pointer paths consistent.
		useFocus: (context: Context) => ({
			reference: { onFocus: () => context?.onOpenChange?.(true) },
		}),
		useClick: (context: Context) => ({
			reference: { onClick: () => context?.onOpenChange?.(true) },
		}),
		useInteractions: (interactions: Interaction[] = []) => ({
			getReferenceProps: (userProps: Props = {}) =>
				mergeProps([userProps, ...interactions.map((i) => i?.reference)]),
			getFloatingProps: (userProps: Props = {}) =>
				mergeProps([userProps, ...interactions.map((i) => i?.floating)]),
			getItemProps: <T,>(x: T) => x,
		}),
	}
})

const noop = () => {}

function makeContext(overrides: { open?: boolean; interactive?: boolean } = {}) {
	return {
		open: overrides.open ?? true,
		interactive: overrides.interactive ?? false,
		enabled: true,
		setReference: noop,
		setFloating: noop,
		floatingStyles: {},
		getReferenceProps: () => ({}),
		getFloatingProps: () => ({}),
	}
}

describe('Tooltip', () => {
	it('closes when an overlay opens', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Trigger</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger')

		if (!trigger) throw new Error('trigger missing')

		await user.click(trigger)

		await waitFor(() => expect(screen.getByText('Tooltip text')).toBeInTheDocument())

		act(() => notifyOverlaySignal())

		expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument()
	})

	it('clones the reference onto the child element instead of a wrapper', () => {
		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger')

		// The trigger IS the button — no intermediate non-focusable <div>.
		expect(trigger?.tagName).toBe('BUTTON')
		expect(trigger).toHaveTextContent('Hover me')
	})

	it('merges the floating ref with a ref already on the child', () => {
		const ref = createRef<HTMLButtonElement>()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button ref={ref} type="button">
						Hover me
					</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		expect(ref.current).toBe(bySlot(container, 'tooltip-trigger'))
	})

	it("composes the child's own onClick with the tooltip handlers", async () => {
		const onClick = vi.fn()

		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button" onClick={onClick}>
						Hover me
					</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		await user.click(bySlot(container, 'tooltip-trigger') as HTMLElement)

		expect(onClick).toHaveBeenCalledOnce()
	})

	it('puts the trigger in the keyboard tab order', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		await user.tab()

		// The trigger is the focusable element itself, not an unreachable wrapper.
		expect(bySlot(container, 'tooltip-trigger')).toHaveFocus()
	})

	it('opens on keyboard focus of the trigger', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		await user.tab()

		expect(bySlot(container, 'tooltip-trigger')).toHaveFocus()

		await waitFor(() => expect(screen.getByText('Tooltip text')).toBeInTheDocument())
	})

	it('describes the focusable trigger via the panel when open', async () => {
		const user = userEvent.setup()

		const { container } = renderUI(
			<Tooltip>
				<TooltipTrigger>
					<button type="button">Hover me</button>
				</TooltipTrigger>
				<TooltipContent>Tooltip text</TooltipContent>
			</Tooltip>,
		)

		const trigger = bySlot(container, 'tooltip-trigger') as HTMLElement

		await user.click(trigger)

		await waitFor(() => expect(bySlot(container, 'tooltip-content')).toBeInTheDocument())

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		// The description relationship is anchored on the focusable trigger itself,
		// pointing at the role="tooltip" panel.
		expect(panel).toHaveAttribute('role', 'tooltip')
		expect(trigger.getAttribute('aria-describedby')).toBe(panel.getAttribute('id'))
	})
})

describe('TooltipContent', () => {
	it('renders the floating panel when the tooltip context reports open=true', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true })}>
				<TooltipContent>Tip body</TooltipContent>
			</TooltipContext>,
		)

		expect(bySlot(container, 'tooltip-content')).toBeInTheDocument()

		expect(screen.getByText('Tip body')).toBeInTheDocument()
	})

	it('omits the floating panel when the tooltip is closed', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: false })}>
				<TooltipContent>Hidden</TooltipContent>
			</TooltipContext>,
		)

		expect(bySlot(container, 'tooltip-content')).not.toBeInTheDocument()
	})

	it('marks the open panel as pointer-events:auto when interactive=true', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true, interactive: true })}>
				<TooltipContent>Interactive</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel).toBeInTheDocument()

		expect(panel.style.pointerEvents).toBe('auto')
	})

	it('marks the open panel as pointer-events:none when interactive=false', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true, interactive: false })}>
				<TooltipContent>Static</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel.style.pointerEvents).toBe('none')
	})

	it('resolves the explicit size prop into the data-density attribute', () => {
		const { container } = renderUI(
			<TooltipContext value={makeContext({ open: true })}>
				<TooltipContent size="lg">Big</TooltipContent>
			</TooltipContext>,
		)

		const panel = bySlot(container, 'tooltip-content') as HTMLElement

		expect(panel).toHaveAttribute('data-density', 'lg')
	})
})
