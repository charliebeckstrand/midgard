import { describe, expect, it } from 'vitest'
import { Example } from '../../components/example'
import { resolveResize, resolveWidth, SNAP_STEP } from '../../components/example-resize'
import { bySlot, renderUI, screen } from '../helpers'

// Example derives its code block from children; a bare string keeps derivation
// trivial and leaves the resize surface the only thing under test.
function renderExample(resize?: Parameters<typeof Example>[0]['resize']) {
	return renderUI(<Example resize={resize}>demo</Example>)
}

describe('resolveResize', () => {
	it('treats undefined and false as off', () => {
		expect(resolveResize(undefined)).toBeNull()

		expect(resolveResize(false)).toBeNull()
	})

	it('treats an object with enabled: false as off', () => {
		expect(resolveResize({ enabled: false, min: 100 })).toBeNull()
	})

	it('gives true auto bounds with snapping off', () => {
		expect(resolveResize(true)).toEqual({ snap: false })
	})

	it('defaults snap off and leaves bounds as passed', () => {
		expect(resolveResize({ min: 120, max: 320 })).toEqual({ min: 120, max: 320, snap: false })
	})

	it('carries snap through when set', () => {
		expect(resolveResize({ snap: true })).toEqual({ snap: true })
	})
})

describe('resolveWidth', () => {
	it('returns the proposed width when unbounded', () => {
		expect(resolveWidth(240, { snap: false })).toBe(240)
	})

	it('clamps to min and max', () => {
		expect(resolveWidth(50, { min: 120, max: 320, snap: false })).toBe(120)

		expect(resolveWidth(500, { min: 120, max: 320, snap: false })).toBe(320)
	})

	it('never returns a negative width', () => {
		expect(resolveWidth(-40, { snap: false })).toBe(0)
	})

	it('snaps to the grid when enabled', () => {
		expect(resolveWidth(SNAP_STEP * 3 + 2, { snap: true })).toBe(SNAP_STEP * 3)

		expect(resolveWidth(SNAP_STEP * 3 - 2, { snap: true })).toBe(SNAP_STEP * 3)
	})

	it('re-clamps after snapping so min still wins', () => {
		// Snapping 122 rounds to 120, below a min of 121; the bound holds.
		expect(resolveWidth(122, { min: 121, snap: true })).toBe(121)
	})
})

describe('Example resize', () => {
	it('renders no handle and a solid border by default', () => {
		const { container } = renderExample()

		expect(bySlot(container, 'example-resize-handle')).toBeNull()

		expect(bySlot(container, 'example-frame')).not.toHaveClass('border-dashed')
	})

	it('dashes the border and renders a separator handle when enabled', () => {
		const { container } = renderExample(true)

		expect(bySlot(container, 'example-frame')).toHaveClass('border-dashed')

		const handle = screen.getByRole('separator', { name: 'Resize example' })

		expect(handle).toBeInTheDocument()

		expect(handle).toHaveAttribute('aria-orientation', 'vertical')
	})

	it('stays off when the object form disables it', () => {
		const { container } = renderExample({ enabled: false })

		expect(bySlot(container, 'example-resize-handle')).toBeNull()

		expect(bySlot(container, 'example-frame')).not.toHaveClass('border-dashed')
	})

	it('reflects pixel bounds on the handle', () => {
		renderExample({ min: 120, max: 320 })

		const handle = screen.getByRole('separator', { name: 'Resize example' })

		expect(handle).toHaveAttribute('aria-valuemin', '120')

		expect(handle).toHaveAttribute('aria-valuemax', '320')
	})
})
