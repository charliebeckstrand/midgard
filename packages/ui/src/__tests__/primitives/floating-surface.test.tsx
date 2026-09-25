import { createRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { FloatingSurface } from '../../primitives/floating-surface'
import { fireEvent, noop, present, renderUI, screen } from '../helpers'

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

		const el = present(document.querySelector('[data-slot="composed"]'), '[data-slot="composed"]')

		fireEvent.keyDown(el, { key: 'a' })

		expect(onKeyDown).toHaveBeenCalled()
	})

	// `getFloatingProps` hands user props back, `ref` among them. A consumer ref
	// must join the positioning ref, not replace it, or the engine never sees
	// the wrapper.
	it('hands the wrapper to setFloating when a consumer holds a ref', () => {
		const setFloating = vi.fn()

		const ref = createRef<HTMLDivElement>()

		renderUI(
			<FloatingSurface open {...baseProps} setFloating={setFloating} ref={ref} data-slot="held">
				<span>panel</span>
			</FloatingSurface>,
		)

		const wrapper = present(document.querySelector('[data-slot="held"]'), '[data-slot="held"]')

		expect(ref.current).toBe(wrapper)

		expect(setFloating).toHaveBeenCalledWith(wrapper)
	})

	it('leaves an open surface free to take input', () => {
		renderUI(
			<FloatingSurface open {...baseProps} data-slot="live">
				<span>panel</span>
			</FloatingSurface>,
		)

		// The inert write that makes a *closing* surface stop swallowing hovers is
		// a browser case: jsdom's mocked `AnimatePresence` drops the node in the
		// same commit, so there is never an exiting surface to observe.
		expect(document.querySelector<HTMLElement>('[data-slot="live"]')?.style.pointerEvents).toBe('')
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
