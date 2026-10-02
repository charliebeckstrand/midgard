import { act, render } from '@testing-library/react'
import { createRef, type Ref, useState } from 'react'
import { afterEach, describe, expect, it, type Mock, vi } from 'vitest'
import {
	type SignaturePadHandle,
	type SignaturePadStateOptions,
	useSignaturePadState,
} from '../../components/signature-pad/use-signature-pad-state'
import { makePointerEvent } from '../helpers'

// Minimal mock shape for the CanvasRenderingContext2D members the hook reads.
// Per-method overrides are attached via `Object.defineProperty` (no casts needed).
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

type HarnessProps = SignaturePadStateOptions & {
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

/** The harness props, with the stroke settings defaulted by {@link renderHarness}. */
type RenderHarness = Omit<HarnessProps, 'context' | 'strokeColor' | 'strokeWidth'> &
	Partial<Pick<HarnessProps, 'strokeColor' | 'strokeWidth'>> & { context?: RenderedContext }

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

		expect(captured.state?.empty).toBe(true)
	})

	it('starts non-empty when a defaultValue is provided', () => {
		const { captured, context } = renderHarness({
			defaultValue: 'data:,seed',
		})

		expect(captured.state?.empty).toBe(false)

		// The value-sync effect clears the canvas before the snapshot paint.
		expect(context?.clearRect).toHaveBeenCalled()
	})

	it('paints the canvas when a controlled value flips from null to a data URL', () => {
		const onValueChange = vi.fn()

		const { context, rerender, captured } = renderHarness({
			value: null,
			onValueChange,
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

		expect(captured.state?.empty).toBe(false)
	})

	it('clears the canvas and flips isEmpty when a controlled value becomes null', () => {
		const { context, rerender, captured } = renderHarness({
			value: 'data:,seed',
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

		expect(captured.state?.empty).toBe(true)
	})

	it('clear() wipes the canvas, flips isEmpty, and notifies via onValueChange', () => {
		const onValueChange = vi.fn()

		const { context, captured } = renderHarness({
			defaultValue: 'data:,seed',
			onValueChange,
		})

		context?.clearRect.mockClear()

		act(() => {
			captured.state?.clear()
		})

		expect(context?.clearRect).toHaveBeenCalled()

		expect(captured.state?.empty).toBe(true)

		expect(onValueChange).toHaveBeenLastCalledWith(null)
	})

	it('clear() is a no-op on the canvas when the 2d context is unavailable', () => {
		const { captured } = renderHarness({ context: null })

		expect(() => {
			act(() => {
				captured.state?.clear()
			})
		}).not.toThrow()

		expect(captured.state?.empty).toBe(true)
	})

	it('exposes clear, toDataURL, and isEmpty through the imperative handle', () => {
		const ref = createRef<SignaturePadHandle>()

		const { context } = renderHarness({
			ref: ref as Ref<SignaturePadHandle>,
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

	it('does not repaint when a controlled value matches the shown value', () => {
		// Re-rendering with the same controlled value triggers no additional
		// clearRect. Guards the early-return path (effect dependency [current] is
		// referentially stable).
		const { context, rerender, captured } = renderHarness({
			value: 'data:,stable',
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

	it('wipes a stroke that a controlled owner refuses to take', () => {
		// The owner keeps `null`, so the stroke must not stay on the pad while the
		// value says the pad is empty.
		const onValueChange = vi.fn()

		const { context, captured } = renderHarness({
			value: null,
			onValueChange,
			canvasDataURL: 'data:,refused',
		})

		const clearCallsBefore = context?.clearRect.mock.calls.length ?? 0

		const target = document.createElement('div')

		target.setPointerCapture = vi.fn()

		act(() => {
			captured.state?.handlePointerDown(
				makePointerEvent({
					clientX: 10,
					clientY: 10,
					button: 0,
					pointerId: 1,
					pointerType: 'mouse',
					currentTarget: target,
				}),
			)
		})

		expect(captured.state?.empty).toBe(false)

		act(() => {
			captured.state?.commit()
		})

		expect(onValueChange).toHaveBeenCalledWith('data:,refused')

		expect(captured.state?.empty).toBe(true)

		expect(context?.clearRect.mock.calls.length).toBeGreaterThan(clearCallsBefore)
	})

	it('keeps a stroke that a controlled owner takes', () => {
		function Owner() {
			const [value, setValue] = useState<string | null>(null)

			return (
				<Harness
					value={value}
					onValueChange={setValue}
					strokeColor="#000"
					strokeWidth={2}
					context={ownerContext}
					canvasDataURL="data:,taken"
					captureState={(state) => {
						ownerState.current = state
					}}
				/>
			)
		}

		const ownerContext = makeContext()

		const ownerState: { current?: ReturnType<typeof useSignaturePadState> } = {}

		render(<Owner />)

		const target = document.createElement('div')

		target.setPointerCapture = vi.fn()

		act(() => {
			ownerState.current?.handlePointerDown(
				makePointerEvent({
					clientX: 10,
					clientY: 10,
					button: 0,
					pointerId: 1,
					pointerType: 'mouse',
					currentTarget: target,
				}),
			)
		})

		const clearCallsBefore = ownerContext.clearRect.mock.calls.length

		act(() => {
			ownerState.current?.commit()
		})

		expect(ownerState.current?.empty).toBe(false)

		expect(ownerContext.clearRect.mock.calls.length).toBe(clearCallsBefore)
	})
})
