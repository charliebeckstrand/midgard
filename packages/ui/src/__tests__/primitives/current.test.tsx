import { renderHook } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import {
	CurrentContent,
	CurrentContents,
	CurrentContext,
	type CurrentMount,
	useCurrent,
	useCurrentPanelActive,
	useCurrentState,
} from '../../primitives/current'
import { renderUI, screen, userEvent } from '../helpers'

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
})

describe('CurrentContents / CurrentContent', () => {
	it('CurrentContents renders with its data-slot', () => {
		const { container } = renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade={false}>
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
				<CurrentContents slotPrefix="test" fade={false}>
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
				<CurrentContents slotPrefix="test" fade={false}>
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

	it('forwards id / role / aria-* in fade mode', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade>
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

	it('preserves caller style under the positioning keys in fade mode', () => {
		renderUI(
			<CurrentContext value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade>
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
		fade = false,
		initial = 'a',
		onSetup,
		onCleanup,
	}: {
		mount?: CurrentMount
		fade?: boolean
		initial?: string
		onSetup?: () => void
		onCleanup?: () => void
	}) {
		const [value, setValue] = useState<string | undefined>(initial)

		return (
			<>
				<button type="button" onClick={() => setValue('a')}>
					go-a
				</button>
				<button type="button" onClick={() => setValue('b')}>
					go-b
				</button>
				<CurrentContext value={{ value, onValueChange: setValue }}>
					<CurrentContents slotPrefix="test" fade={fade} mount={mount}>
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

	it('mount="always" with fade=false holds inactive panels mounted but hidden via Activity', () => {
		renderUI(<Panels mount="always" initial="a" />)

		expect(screen.getByText('Content A')).toBeVisible()

		// Activity mode="hidden" keeps the node in the DOM but not visible.
		const hidden = screen.getByText('Content B')

		expect(hidden).toBeInTheDocument()

		expect(hidden).not.toBeVisible()
	})

	it('mount="always" preserves a hidden panel’s DOM state across switches', async () => {
		const user = userEvent.setup()

		renderUI(<Panels mount="always" initial="b" />)

		await user.type(screen.getByTestId('b-input'), 'kept')

		await user.click(screen.getByText('go-a'))

		// B is hidden now, but still mounted, so its uncontrolled value survives.
		expect((screen.getByTestId('b-input') as HTMLInputElement).value).toBe('kept')
	})

	it('mount="always" fade=false tears down a hidden panel’s effects, then remounts them', async () => {
		const user = userEvent.setup()

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

	it('mount="lazy" defers a panel until first activation, then holds it', async () => {
		const user = userEvent.setup()

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
				<CurrentContents slotPrefix="test" fade>
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
				<CurrentContents slotPrefix="outer" fade>
					<CurrentContent slotPrefix="outer" value="outer-a">
						<CurrentContext value={{ value: 'inner-a', onValueChange: undefined }}>
							<CurrentContents slotPrefix="inner" fade>
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
