import { renderHook } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	CurrentContent,
	CurrentContents,
	CurrentContext,
	useCurrent,
	useCurrentState,
} from '../../primitives/current'
import { useCurrentPanelActive } from '../../primitives/current/current'
import type { Mount } from '../../primitives/mount'
import { act, bySlot, renderUI, screen, setupUser } from '../helpers'

function ActiveProbe({ id }: { id: string }) {
	return <span data-testid={id}>{String(useCurrentPanelActive())}</span>
}

describe('useCurrent', () => {
	it('returns undefined outside provider', () => {
		const { result } = renderHook(() => useCurrent())

		expect(result.current).toBeUndefined()
	})
})

describe('useCurrentState', () => {
	it('returns a context value with the current value and onValueChange', () => {
		const { result } = renderHook(() => useCurrentState({ defaultValue: 'tab1' }))

		expect(result.current.value).toBe('tab1')

		expect(typeof result.current.onValueChange).toBe('function')
	})

	it('keeps a controlled null as null, not as an unvalued context', () => {
		const { result } = renderHook(() => useCurrentState({ value: null, onValueChange: vi.fn() }))

		expect(result.current.value).toBeNull()
	})
})

describe('CurrentContents / CurrentContent', () => {
	it('CurrentContents renders with its data-slot', () => {
		const { container } = renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" animate={false}>
					<CurrentContent slotPrefix="test" value="a">
						Content A
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		expect(container.querySelector('[data-slot="test-contents"]')).toBeInTheDocument()
	})

	it('CurrentContent renders matching value', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" animate={false}>
					<CurrentContent slotPrefix="test" value="a">
						Content A
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b">
						Content B
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		expect(screen.getByText('Content A')).toBeInTheDocument()

		expect(screen.queryByText('Content B')).not.toBeInTheDocument()
	})

	it('CurrentContent renders all when no value set', () => {
		renderUI(
			<CurrentContext value={{ value: undefined, onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" animate={false}>
					<CurrentContent slotPrefix="test" value="a">
						A
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b">
						B
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		expect(screen.getByText('A')).toBeInTheDocument()

		expect(screen.getByText('B')).toBeInTheDocument()
	})

	it('CurrentContent renders no valued panel when controlled with none active', () => {
		function NoneActive() {
			const context = useCurrentState({ value: null, onValueChange: () => {} })

			return (
				<CurrentContext value={context}>
					<CurrentContents slotPrefix="test" animate={false} mount="active">
						<CurrentContent slotPrefix="test" value="a">
							A
						</CurrentContent>
						<CurrentContent slotPrefix="test" value="b">
							B
						</CurrentContent>
					</CurrentContents>
				</CurrentContext>
			)
		}

		renderUI(<NoneActive />)

		// CONVENTIONS §7.3: `null` keeps the root controlled with none active.
		expect(screen.queryByText('A')).not.toBeInTheDocument()

		expect(screen.queryByText('B')).not.toBeInTheDocument()
	})

	it('forwards id / role / aria-* in fade mode', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" animate="fade">
					<CurrentContent
						slotPrefix="test"
						value="a"
						id="panel-a"
						role="tabpanel"
						aria-labelledby="tab-a"
					>
						Content A
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		const panel = screen.getByRole('tabpanel')

		expect(panel).toHaveAttribute('id', 'panel-a')

		expect(panel).toHaveAttribute('aria-labelledby', 'tab-a')
	})

	it.each(['fade', 'slide', false] as const)(
		'takes a caller data-slot rename with animate=%s',
		(animate) => {
			const { container } = renderUI(
				<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
					<CurrentContents slotPrefix="test" animate={animate}>
						<CurrentContent slotPrefix="test" value="a" data-slot="my-panel">
							Content A
						</CurrentContent>
					</CurrentContents>
				</CurrentContext>,
			)

			// The anchor a test author queries by must not change with the container's
			// fade flag: the caller's rename wins in both branches.
			expect(bySlot(container, 'my-panel')).toBeInTheDocument()

			expect(bySlot(container, 'test-content')).toBeNull()
		},
	)

	it('preserves caller style under the positioning keys in fade mode', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" animate="fade" mount="always">
					<CurrentContent slotPrefix="test" value="a" style={{ minHeight: 120 }}>
						Content A
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b" style={{ minHeight: 80 }}>
						Content B
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		const current = screen.getByText('Content A')

		expect(current).toHaveStyle({ minHeight: '120px', position: 'relative' })

		// The faded-out panel keeps its caller style too; positioning wins.
		const hidden = screen.getByText('Content B')

		expect(hidden).toHaveStyle({ minHeight: '80px', position: 'absolute' })
	})
})

describe('CurrentContent mount policy', () => {
	function Probe({ onSetup, onCleanup }: { onSetup?: () => void; onCleanup?: () => void }) {
		useEffect(() => {
			onSetup?.()

			return () => onCleanup?.()
		}, [onSetup, onCleanup])

		return <input data-testid="b-input" defaultValue="" />
	}

	function Panels({
		mount,
		animate = false,
		initial = 'a',
		onSetup,
		onCleanup,
	}: {
		mount?: Mount
		animate?: 'fade' | 'slide' | false
		initial?: string
		onSetup?: () => void
		onCleanup?: () => void
	}) {
		const [value, setValue] = useState<string | null>(initial)

		return (
			<>
				<button type="button" onClick={() => setValue('a')}>
					go-a
				</button>
				<button type="button" onClick={() => setValue('b')}>
					go-b
				</button>
				<CurrentContext value={{ value: value ?? undefined, onValueChange: setValue }}>
					<CurrentContents slotPrefix="test" animate={animate} mount={mount}>
						<CurrentContent slotPrefix="test" value="a">
							Content A
						</CurrentContent>
						<CurrentContent slotPrefix="test" value="b">
							<Probe onSetup={onSetup} onCleanup={onCleanup} />
							Content B
						</CurrentContent>
					</CurrentContents>
				</CurrentContext>
			</>
		)
	}

	it('mount="active" mounts only the active panel', () => {
		renderUI(<Panels mount="active" />)

		expect(screen.getByText('Content A')).toBeInTheDocument()

		expect(screen.queryByText('Content B')).not.toBeInTheDocument()
	})

	it('mount="always" with animate=false holds inactive panels mounted but hidden via Activity', () => {
		renderUI(<Panels mount="always" initial="a" />)

		expect(screen.getByText('Content A')).toBeVisible()

		// Activity mode="hidden" keeps the node in the DOM but not visible.
		const hidden = screen.getByText('Content B')

		expect(hidden).toBeInTheDocument()

		expect(hidden).not.toBeVisible()
	})

	it('mount="always" preserves a hidden panel’s DOM state across switches', async () => {
		const user = setupUser()

		renderUI(<Panels mount="always" initial="b" />)

		await user.type(screen.getByTestId('b-input'), 'kept')

		await user.click(screen.getByText('go-a'))

		// B is hidden now, but still mounted, so its uncontrolled value survives.
		expect((screen.getByTestId('b-input') as HTMLInputElement).value).toBe('kept')
	})

	it('mount="always" animate=false tears down a hidden panel’s effects, then remounts them', async () => {
		const user = setupUser()

		const onSetup = vi.fn()

		const onCleanup = vi.fn()

		renderUI(<Panels mount="always" initial="b" onSetup={onSetup} onCleanup={onCleanup} />)

		expect(onSetup).toHaveBeenCalledTimes(1)

		expect(onCleanup).not.toHaveBeenCalled()

		await user.click(screen.getByText('go-a'))

		// Hiding the panel via Activity unmounts its effects while keeping the DOM.
		expect(onCleanup).toHaveBeenCalledTimes(1)

		expect(screen.getByTestId('b-input')).toBeInTheDocument()

		await user.click(screen.getByText('go-b'))

		// Showing it again re-runs the effect.
		expect(onSetup).toHaveBeenCalledTimes(2)
	})

	describe.each(['fade', 'slide'] as const)('animate=%s', (animate) => {
		it('mount="active" with an animation mounts only the active panel up front', () => {
			renderUI(<Panels mount="active" animate={animate} />)

			expect(screen.getByText('Content A')).toBeInTheDocument()

			expect(screen.queryByText('Content B')).not.toBeInTheDocument()
		})

		it('mount="active" with an animation unmounts the outgoing panel once its exit completes', async () => {
			const user = setupUser()

			const onCleanup = vi.fn()

			renderUI(<Panels mount="active" animate={animate} initial="b" onCleanup={onCleanup} />)

			expect(screen.getByTestId('b-input')).toBeInTheDocument()

			await user.click(screen.getByText('go-a'))

			// The motion mock completes the retargeted opacity animation on the next
			// commit, which releases the exit hold: the outgoing panel is unmounted
			// and its state torn down, per `active` semantics.
			expect(screen.queryByText('Content B')).not.toBeInTheDocument()

			expect(onCleanup).toHaveBeenCalledTimes(1)

			expect(screen.getByText('Content A')).toBeInTheDocument()
		})

		it('mount="lazy" with an animation holds a visited panel through the animation', async () => {
			const user = setupUser()

			renderUI(<Panels mount="lazy" animate={animate} />)

			expect(screen.queryByText('Content B')).not.toBeInTheDocument()

			await user.click(screen.getByText('go-b'))

			expect(screen.getByText('Content B')).toBeInTheDocument()

			await user.click(screen.getByText('go-a'))

			// Visited panels stay mounted as fade-mode hidden panels; only `active`
			// unmounts after its fade-out.
			expect(screen.getByText('Content B')).toHaveStyle({ position: 'absolute' })
		})

		// A panel that stops being current before its first frame never started its
		// fade, so no fade-out lands to release it.
		it('mount="always" with an animation rests a panel left before its entrance starts', () => {
			renderUI(<Panels mount="always" animate={animate} />)

			act(() => {
				screen.getByText('go-b').click()
			})

			act(() => {
				screen.getByText('go-a').click()
			})

			expect(screen.getByText('Content B')).not.toBeVisible()
		})

		// The frame that readies the fade and the switch away can land in one render.
		// Then the fade target stays at 0, and no fade-out lands to release the panel.
		it('mount="always" with an animation rests a panel left in the render that readies its entrance', () => {
			renderUI(<Panels mount="always" animate={animate} />)

			const frames: FrameRequestCallback[] = []

			const raf = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
				frames.push(callback)

				return frames.length
			})

			act(() => {
				screen.getByText('go-b').click()
			})

			act(() => {
				for (const frame of frames.splice(0)) frame(performance.now())

				screen.getByText('go-a').click()
			})

			raf.mockRestore()

			expect(screen.getByText('Content B')).not.toBeVisible()
		})

		it('mount="active" with an animation unmounts a panel left before its entrance starts', () => {
			renderUI(<Panels mount="active" animate={animate} />)

			act(() => {
				screen.getByText('go-b').click()
			})

			act(() => {
				screen.getByText('go-a').click()
			})

			expect(screen.queryByText('Content B')).not.toBeInTheDocument()
		})
	})

	it('a non-fading container nested in a fading one keeps its plain rendering', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="outer" animate="fade">
					<CurrentContent slotPrefix="outer" value="a">
						<CurrentContext value={{ value: 'x', onValueChange: undefined }}>
							<CurrentContents slotPrefix="inner" animate={false} mount="always">
								<CurrentContent slotPrefix="inner" value="y">
									Inner Y
								</CurrentContent>
							</CurrentContents>
						</CurrentContext>
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		// The inner container re-scopes the fade signal off, so its inactive
		// panel is held via Activity (hidden), not the absolute-positioned
		// cross-fade branch.
		expect(screen.getByText('Inner Y')).not.toBeVisible()
	})

	it('mount="lazy" defers a panel until first activation, then holds it', async () => {
		const user = setupUser()

		const onSetup = vi.fn()

		renderUI(<Panels mount="lazy" initial="a" onSetup={onSetup} />)

		// Never-visited panel B is absent, so its effect has not run.
		expect(screen.queryByText('Content B')).not.toBeInTheDocument()

		expect(onSetup).not.toHaveBeenCalled()

		await user.click(screen.getByText('go-b'))

		expect(screen.getByText('Content B')).toBeVisible()

		expect(onSetup).toHaveBeenCalledTimes(1)

		await user.click(screen.getByText('go-a'))

		// Once visited, the panel stays mounted (hidden), unlike mount="active".
		expect(screen.getByText('Content B')).toBeInTheDocument()

		expect(screen.getByText('Content B')).not.toBeVisible()
	})
})

describe('useCurrentPanelActive', () => {
	it('defaults to true outside any panel', () => {
		const { result } = renderHook(() => useCurrentPanelActive())

		expect(result.current).toBe(true)
	})

	it('is true on the active panel and false on a mounted inactive one', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" animate="fade" mount="always">
					<CurrentContent slotPrefix="test" value="a">
						<ActiveProbe id="a" />
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b">
						<ActiveProbe id="b" />
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		expect(screen.getByTestId('a')).toHaveTextContent('true')

		expect(screen.getByTestId('b')).toHaveTextContent('false')
	})

	it('folds across nesting: an active panel inside an inactive one reads false', () => {
		renderUI(
			<CurrentContext value={{ value: 'outer-b', onValueChange: undefined }}>
				<CurrentContents slotPrefix="outer" animate="fade" mount="always">
					<CurrentContent slotPrefix="outer" value="outer-a">
						<CurrentContext value={{ value: 'inner-a', onValueChange: undefined }}>
							<CurrentContents slotPrefix="inner" animate="fade" mount="always">
								<CurrentContent slotPrefix="inner" value="inner-a">
									<ActiveProbe id="nested" />
								</CurrentContent>
							</CurrentContents>
						</CurrentContext>
					</CurrentContent>
					<CurrentContent slotPrefix="outer" value="outer-b">
						<ActiveProbe id="outer-active" />
					</CurrentContent>
				</CurrentContents>
			</CurrentContext>,
		)

		// inner-a matches its own context, but its inactive outer panel folds it to false.
		expect(screen.getByTestId('nested')).toHaveTextContent('false')

		expect(screen.getByTestId('outer-active')).toHaveTextContent('true')
	})
})
