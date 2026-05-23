import { describe, expect, it } from 'vitest'
import { FloatingSurface } from '../../primitives/floating-surface'
import { renderUI, screen } from '../helpers'

const noop = () => {}

const baseProps = {
	setFloating: noop,
	floatingStyles: {},
	getFloatingProps: () => ({}),
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

	it('merges caller style over floatingStyles on the positioned wrapper', () => {
		renderUI(
			<FloatingSurface
				open
				setFloating={noop}
				floatingStyles={{ position: 'absolute' }}
				getFloatingProps={() => ({})}
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
