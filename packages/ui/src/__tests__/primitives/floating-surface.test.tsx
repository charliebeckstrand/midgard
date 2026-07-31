import { describe, expect, it, vi } from 'vitest'
import { FloatingSurface } from '../../primitives/floating-surface'
import { fireEvent, renderUI, screen } from '../helpers'

const noop = () => {}

// Mirrors floating-ui's contract: user props merge into the result.
const mergeFloatingProps = (userProps?: object) => ({ ...userProps })

const baseProps = {
	setFloating: noop,
	floatingStyles: {},
	getFloatingProps: mergeFloatingProps,
}

describe('FloatingSurface', () => {
	it('renders children inside the portal when open=true', () => {
		renderUI(
			<FloatingSurface open {...baseProps} data-slot="test-surface">
				<span>visible</span>
			</FloatingSurface>,
		)

		expect(screen.getByText('visible')).toBeInTheDocument()

		expect(document.querySelector('[data-slot="test-surface"]')).not.toBeNull()
	})

	it('omits children when open=false', () => {
		renderUI(
			<FloatingSurface open={false} {...baseProps}>
				<span>hidden</span>
			</FloatingSurface>,
		)

		expect(screen.queryByText('hidden')).toBeNull()
	})

	it('routes forwarded props through getFloatingProps so handlers compose', () => {
		const getFloatingProps = vi.fn(mergeFloatingProps)

		const onKeyDown = vi.fn()

		renderUI(
			<FloatingSurface
				open
				setFloating={noop}
				floatingStyles={{}}
				getFloatingProps={getFloatingProps}
				onKeyDown={onKeyDown}
				data-slot="composed"
			>
				<span>panel</span>
			</FloatingSurface>,
		)

		// The consumer handler reaches floating-ui's merger rather than being
		// clobbered by its return.
		expect(getFloatingProps).toHaveBeenCalledWith(expect.objectContaining({ onKeyDown }))

		const el = document.querySelector<HTMLElement>('[data-slot="composed"]') as HTMLElement

		fireEvent.keyDown(el, { key: 'a' })

		expect(onKeyDown).toHaveBeenCalled()
	})

	it('leaves nothing on screen once it closes', () => {
		const { rerender } = renderUI(
			<FloatingSurface open {...baseProps} data-slot="exiting">
				<span>panel</span>
			</FloatingSurface>,
		)

		const el = document.querySelector<HTMLElement>('[data-slot="exiting"]')

		expect(el?.style.pointerEvents).toBe('')

		rerender(
			<FloatingSurface open={false} {...baseProps} data-slot="exiting">
				<span>panel</span>
			</FloatingSurface>,
		)

		// Under jsdom the exit resolves in the same commit, so there is no surface
		// left to take input. A browser animates that exit, and the wrapper is made
		// inert for its duration — written to the node, since `AnimatePresence`
		// renders the exiting subtree from the props it held while open, so a prop
		// keyed on `open` never reaches it.
		expect(el?.isConnected).toBe(false)
	})

	it('merges caller style over floatingStyles on the positioned wrapper', () => {
		renderUI(
			<FloatingSurface
				open
				setFloating={noop}
				floatingStyles={{ position: 'absolute' }}
				getFloatingProps={mergeFloatingProps}
				style={{ pointerEvents: 'auto' }}
				data-slot="merged-style"
			>
				<span>panel</span>
			</FloatingSurface>,
		)

		const el = document.querySelector<HTMLElement>('[data-slot="merged-style"]')

		expect(el?.style.position).toBe('absolute')

		expect(el?.style.pointerEvents).toBe('auto')
	})
})
