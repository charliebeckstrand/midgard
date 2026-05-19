import { act, render } from '@testing-library/react'
import { createRef, type Ref } from 'react'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import {
	type SignaturePadHandle,
	type UseSignaturePadStateOptions,
	useSignaturePadState,
} from '../../components/signature-pad/use-signature-pad-state'

// The hook only reads a handful of CanvasRenderingContext2D members. Typing the
// mock as a free-standing shape (rather than CanvasRenderingContext2D itself)
// avoids satisfying ~60 unused properties; the per-method overrides on the
// canvas element are attached via `Object.defineProperty`, which doesn't
// type-check the property value — no casts needed at the seam.
type ContextMock = {
	clearRect: Mock
	scale: Mock
	drawImage: Mock
	beginPath: Mock
	moveTo: Mock
	lineTo: Mock
	stroke: Mock
	arc: Mock
	fill: Mock
	lineCap: CanvasLineCap
	lineJoin: CanvasLineJoin
	strokeStyle: string
	fillStyle: string
	lineWidth: number
}

function makeContext(): ContextMock {
	return {
		clearRect: vi.fn(),
		scale: vi.fn(),
		drawImage: vi.fn(),
		beginPath: vi.fn(),
		moveTo: vi.fn(),
		lineTo: vi.fn(),
		stroke: vi.fn(),
		arc: vi.fn(),
		fill: vi.fn(),
		lineCap: 'round',
		lineJoin: 'round',
		strokeStyle: '',
		fillStyle: '',
		lineWidth: 0,
	}
}

function attachCanvasMocks(
	el: HTMLCanvasElement,
	context: ContextMock | null,
	dataURL: string,
): void {
	Object.defineProperty(el, 'getContext', {
		configurable: true,
		value: () => context,
	})

	Object.defineProperty(el, 'toDataURL', {
		configurable: true,
		value: () => dataURL,
	})

	Object.defineProperty(el, 'getBoundingClientRect', {
		configurable: true,
		value: () => DOMRect.fromRect({ width: 100, height: 60 }),
	})
}

type HarnessProps = UseSignaturePadStateOptions & {
	captureState?: (state: ReturnType<typeof useSignaturePadState>) => void
	context: ContextMock | null
	canvasDataURL?: string
}

function Harness({
	captureState,
	context,
	canvasDataURL = 'data:,canvas',
	...options
}: HarnessProps) {
	const state = useSignaturePadState(options)

	captureState?.(state)

	return (
		<div
			ref={(el) => {
				state.containerRef.current = el

				if (el) {
					el.getBoundingClientRect = () => DOMRect.fromRect({ width: 100, height: 60 })
				}
			}}
		>
			<canvas
				ref={(el) => {
					state.canvasRef.current = el

					if (el) attachCanvasMocks(el, context, canvasDataURL)
				}}
			/>
		</div>
	)
}

type RenderedContext = ContextMock | null

type RenderHarness = Omit<HarnessProps, 'context'> & { context?: RenderedContext }

function renderHarness({ context, ...props }: RenderHarness = {} as RenderHarness) {
	const ctx: RenderedContext = context === undefined ? makeContext() : context

	const captured: { state?: ReturnType<typeof useSignaturePadState> } = {}

	const utils = render(
		<Harness
			{...props}
			context={ctx}
			strokeColor={props.strokeColor ?? '#000'}
			strokeWidth={props.strokeWidth ?? 2}
			captureState={(state) => {
				captured.state = state

				props.captureState?.(state)
			}}
		/>,
	)

	return { ...utils, context: ctx, captured }
}

afterEach(() => {
	vi.restoreAllMocks()
})

describe('useSignaturePadState', () => {
	it('starts empty when no value is provided', () => {
		const { captured } = renderHarness()

		expect(captured.state?.isEmpty).toBe(true)
	})

	it('starts non-empty when a defaultValue is provided', () => {
		const { captured, context } = renderHarness({
			defaultValue: 'data:,seed',
			strokeColor: '#000',
			strokeWidth: 2,
		})

		expect(captured.state?.isEmpty).toBe(false)

		// The value-sync effect should have cleared the canvas in preparation
		// for the snapshot paint.
		expect(context?.clearRect).toHaveBeenCalled()
	})

	it('paints the canvas when a controlled value flips from null to a data URL', () => {
		const onValueChange = vi.fn()

		const { context, rerender, captured } = renderHarness({
			value: null,
			onValueChange,
			strokeColor: '#000',
			strokeWidth: 2,
		})

		const clearCallsBefore = context?.clearRect.mock.calls.length ?? 0

		rerender(
			<Harness
				value="data:,new"
				onValueChange={onValueChange}
				strokeColor="#000"
				strokeWidth={2}
				context={context}
				captureState={(state) => {
					captured.state = state
				}}
			/>,
		)

		// clearRect runs once per value-sync to wipe the canvas before painting.
		expect(context?.clearRect.mock.calls.length).toBeGreaterThan(clearCallsBefore)

		expect(captured.state?.isEmpty).toBe(false)
	})

	it('clears the canvas and flips isEmpty when a controlled value becomes null', () => {
		const { context, rerender, captured } = renderHarness({
			value: 'data:,seed',
			strokeColor: '#000',
			strokeWidth: 2,
		})

		rerender(
			<Harness
				value={null}
				strokeColor="#000"
				strokeWidth={2}
				context={context}
				captureState={(state) => {
					captured.state = state
				}}
			/>,
		)

		expect(context?.clearRect).toHaveBeenCalled()

		expect(captured.state?.isEmpty).toBe(true)
	})

	it('clear() wipes the canvas, flips isEmpty, and notifies via onValueChange', () => {
		const onValueChange = vi.fn()

		const { context, captured } = renderHarness({
			defaultValue: 'data:,seed',
			onValueChange,
			strokeColor: '#000',
			strokeWidth: 2,
		})

		context?.clearRect.mockClear()

		act(() => {
			captured.state?.clear()
		})

		expect(context?.clearRect).toHaveBeenCalled()

		expect(captured.state?.isEmpty).toBe(true)

		expect(onValueChange).toHaveBeenLastCalledWith(null)
	})

	it('clear() is a no-op on the canvas when the 2d context is unavailable', () => {
		const { captured } = renderHarness({ context: null, strokeColor: '#000', strokeWidth: 2 })

		expect(() => {
			act(() => {
				captured.state?.clear()
			})
		}).not.toThrow()

		expect(captured.state?.isEmpty).toBe(true)
	})

	it('exposes clear, toDataURL, and isEmpty through the imperative handle', () => {
		const ref = createRef<SignaturePadHandle>()

		const { context } = renderHarness({
			ref: ref as Ref<SignaturePadHandle>,
			strokeColor: '#000',
			strokeWidth: 2,
			canvasDataURL: 'data:,handle',
		})

		expect(ref.current?.isEmpty()).toBe(true)

		expect(ref.current?.toDataURL()).toBe('data:,handle')

		act(() => {
			ref.current?.clear()
		})

		expect(context?.clearRect).toHaveBeenCalled()
	})

	it('forwards type and quality args through handle.toDataURL', () => {
		const ref = createRef<SignaturePadHandle>()

		const toDataURL = vi.fn(() => 'data:,handle')

		function CustomHarness() {
			const state = useSignaturePadState({
				ref: ref as Ref<SignaturePadHandle>,
				strokeColor: '#000',
				strokeWidth: 2,
			})

			return (
				<div
					ref={(el) => {
						state.containerRef.current = el
					}}
				>
					<canvas
						ref={(el) => {
							state.canvasRef.current = el

							if (el) {
								Object.defineProperty(el, 'getContext', {
									configurable: true,
									value: () => makeContext(),
								})

								Object.defineProperty(el, 'toDataURL', {
									configurable: true,
									value: toDataURL,
								})
							}
						}}
					/>
				</div>
			)
		}

		render(<CustomHarness />)

		ref.current?.toDataURL('image/jpeg', 0.5)

		expect(toDataURL).toHaveBeenCalledWith('image/jpeg', 0.5)
	})

	it('does not repaint when a controlled value matches lastEmittedRef', () => {
		// Re-rendering with the same controlled value should not trigger an
		// additional clearRect, because the effect dependency [current] is
		// referentially stable. This guards the early-return path.
		const { context, rerender, captured } = renderHarness({
			value: 'data:,stable',
			strokeColor: '#000',
			strokeWidth: 2,
		})

		const clearCallsAfterMount = context?.clearRect.mock.calls.length ?? 0

		rerender(
			<Harness
				value="data:,stable"
				strokeColor="#000"
				strokeWidth={2}
				context={context}
				captureState={(state) => {
					captured.state = state
				}}
			/>,
		)

		expect(context?.clearRect.mock.calls.length).toBe(clearCallsAfterMount)
	})

	it('exposes commit and pointer handlers from the underlying drawing hook', () => {
		const { captured } = renderHarness()

		expect(typeof captured.state?.handlePointerDown).toBe('function')

		expect(typeof captured.state?.handlePointerMove).toBe('function')

		expect(typeof captured.state?.commit).toBe('function')
	})
})
