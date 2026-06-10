import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	CurrentContent,
	CurrentContents,
	CurrentContext,
	useCurrent,
	useCurrentState,
} from '../../primitives/current'
import { renderUI, screen } from '../helpers'

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
	it('CurrentContents renders with correct data-slot', () => {
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
