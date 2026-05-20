import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	CurrentContent,
	CurrentContents,
	CurrentProvider,
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
			<CurrentProvider value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade={false}>
					<CurrentContent slotPrefix="test" value="a">
						Content A
					</CurrentContent>
				</CurrentContents>
			</CurrentProvider>,
		)

		expect(container.querySelector('[data-slot="test-contents"]')).toBeInTheDocument()
	})

	it('CurrentContent renders matching value', () => {
		renderUI(
			<CurrentProvider value={{ value: 'a', onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade={false}>
					<CurrentContent slotPrefix="test" value="a">
						Content A
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b">
						Content B
					</CurrentContent>
				</CurrentContents>
			</CurrentProvider>,
		)

		expect(screen.getByText('Content A')).toBeInTheDocument()

		expect(screen.queryByText('Content B')).not.toBeInTheDocument()
	})

	it('CurrentContent renders all when no value set', () => {
		renderUI(
			<CurrentProvider value={{ value: undefined, onValueChange: undefined }}>
				<CurrentContents slotPrefix="test" fade={false}>
					<CurrentContent slotPrefix="test" value="a">
						A
					</CurrentContent>
					<CurrentContent slotPrefix="test" value="b">
						B
					</CurrentContent>
				</CurrentContents>
			</CurrentProvider>,
		)

		expect(screen.getByText('A')).toBeInTheDocument()
		expect(screen.getByText('B')).toBeInTheDocument()
	})
})
