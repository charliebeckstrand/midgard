import { describe, expect, it } from 'vitest'
import { Example } from '../../components/example'
import { maxDefined, resolveResize, resolveWidth, SNAP_STEP } from '../../components/example-resize'
import { bySlot, fireEvent, renderUI, screen } from '../helpers'

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

describe('Example anchors', () => {
	it('derives a stable slug anchor from a string title', () => {
		const { container } = renderUI(<Example title="Server grouping">demo</Example>)

		expect(bySlot(container, 'example')).toHaveAttribute('id', 'server-grouping')
	})

	it('prefers an explicit id over the derived slug', () => {
		const { container } = renderUI(
			<Example id="custom-anchor" title="Server grouping">
				demo
			</Example>,
		)

		expect(bySlot(container, 'example')).toHaveAttribute('id', 'custom-anchor')
	})

	it('links a string title to its own hash anchor', () => {
		renderUI(<Example title="Server grouping">demo</Example>)

		expect(screen.getByRole('link', { name: /Server grouping/ })).toHaveAttribute(
			'href',
			'#server-grouping',
		)
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

	it('reserves right padding so the straddling handle is not clipped at full width', () => {
		const { container } = renderExample(true)

		expect(bySlot(container, 'example')).toHaveClass('pr-2')
	})
})

describe('Example width', () => {
	it('applies a fixed width, with no handle, when resize is off', () => {
		const { container } = renderUI(<Example width={400}>demo</Example>)

		const frame = bySlot(container, 'example-frame')

		expect(frame?.style.width).toBe('400px')

		expect(frame?.style.maxWidth).toBe('100%')

		expect(bySlot(container, 'example-resize-handle')).toBeNull()

		expect(frame).not.toHaveClass('border-dashed')
	})

	it('starts the resizable frame at the given width', () => {
		const { container } = renderUI(
			<Example width={400} resize>
				demo
			</Example>,
		)

		expect(bySlot(container, 'example-frame')?.style.width).toBe('400px')

		expect(screen.getByRole('separator', { name: 'Resize example' })).toHaveAttribute(
			'aria-valuenow',
			'400',
		)
	})
})

describe('maxDefined', () => {
	it('returns whichever bound is defined', () => {
		expect(maxDefined(undefined, undefined)).toBeUndefined()

		expect(maxDefined(120, undefined)).toBe(120)

		expect(maxDefined(undefined, 200)).toBe(200)
	})

	it('returns the larger of two defined bounds', () => {
		expect(maxDefined(120, 200)).toBe(200)

		expect(maxDefined(320, 200)).toBe(320)
	})
})

describe('Example minWidth', () => {
	it('floors the frame with a CSS min-width, without a handle', () => {
		const { container } = renderUI(<Example minWidth={320}>demo</Example>)

		const frame = bySlot(container, 'example-frame')

		expect(frame?.style.minWidth).toBe('320px')

		expect(bySlot(container, 'example-resize-handle')).toBeNull()
	})

	it('clamps a smaller starting width up to the floor', () => {
		const { container } = renderUI(
			<Example width={200} minWidth={320}>
				demo
			</Example>,
		)

		const frame = bySlot(container, 'example-frame')

		expect(frame?.style.width).toBe('320px')

		expect(frame?.style.minWidth).toBe('320px')
	})

	it('is the resize lower bound', () => {
		const { container } = renderUI(
			<Example minWidth={300} resize>
				demo
			</Example>,
		)

		expect(bySlot(container, 'example-frame')?.style.minWidth).toBe('300px')

		expect(screen.getByRole('separator', { name: 'Resize example' })).toHaveAttribute(
			'aria-valuemin',
			'300',
		)
	})

	it('composes with resize.min, the larger floor winning', () => {
		renderUI(
			<Example minWidth={350} resize={{ min: 200, max: 600 }}>
				demo
			</Example>,
		)

		const handle = screen.getByRole('separator', { name: 'Resize example' })

		expect(handle).toHaveAttribute('aria-valuemin', '350')

		expect(handle).toHaveAttribute('aria-valuemax', '600')
	})
})

// jsdom ships no pointer-capture methods; stub them per element (no prototype
// pollution) so the drag handlers, which capture the pointer, run.
function stubPointerCapture(el: HTMLElement) {
	let captured = false

	el.setPointerCapture = () => {
		captured = true
	}

	el.releasePointerCapture = () => {
		captured = false
	}

	el.hasPointerCapture = () => captured
}

describe('Example resize drag', () => {
	// `min: 0` keeps the jsdom-measured base width (0) from clamping, so the
	// applied width is exactly the pointer delta.
	function startDrag() {
		const { container } = renderExample({ min: 0 })

		const handle = bySlot(container, 'example-resize-handle') as HTMLElement

		stubPointerCapture(handle)

		const frame = bySlot(container, 'example-frame') as HTMLElement

		fireEvent.pointerDown(handle, { button: 0, buttons: 1, clientX: 0, pointerId: 1 })

		fireEvent.pointerMove(handle, { buttons: 1, clientX: 120, pointerId: 1 })

		return { handle, frame }
	}

	it('resizes while dragging', () => {
		const { frame } = startDrag()

		expect(frame.style.width).toBe('120px')
	})

	it('stops resizing once the pointer is released', () => {
		const { handle, frame } = startDrag()

		fireEvent.pointerUp(handle, { clientX: 120, pointerId: 1 })

		// A move after release must not resize — the reported bug.
		fireEvent.pointerMove(handle, { buttons: 1, clientX: 400, pointerId: 1 })

		expect(frame.style.width).toBe('120px')
	})

	it('ends the drag when a move reports no button held', () => {
		const { handle, frame } = startDrag()

		// A buttonless move means the pointerup was missed; the drag must end.
		fireEvent.pointerMove(handle, { buttons: 0, clientX: 260, pointerId: 1 })

		expect(frame.style.width).toBe('120px')

		fireEvent.pointerMove(handle, { buttons: 1, clientX: 400, pointerId: 1 })

		expect(frame.style.width).toBe('120px')
	})

	it('ends the drag on pointercancel', () => {
		const { handle, frame } = startDrag()

		fireEvent.pointerCancel(handle, { pointerId: 1 })

		fireEvent.pointerMove(handle, { buttons: 1, clientX: 400, pointerId: 1 })

		expect(frame.style.width).toBe('120px')
	})
})
