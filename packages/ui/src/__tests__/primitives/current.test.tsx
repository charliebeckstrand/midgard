import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
	CurrentProvider,
	createCurrentContent,
	useCurrent,
	useCurrentContext,
} from '../../primitives/current'
import { renderUI, screen } from '../helpers'

describe('useCurrentContext', () => {
	it('returns undefined outside provider', () => {
		const { result } = renderHook(() => useCurrentContext())

		expect(result.current).toBeUndefined()
	})
})

describe('useCurrent', () => {
	it('returns context, value, and setValue', () => {
		const { result } = renderHook(() => useCurrent({ defaultValue: 'tab1' }))

		expect(result.current[1]).toBe('tab1')

		expect(typeof result.current[2]).toBe('function')
	})
})

describe('createCurrentContent', () => {
	const { Contents, Content } = createCurrentContent('test')

	it('Contents renders with correct data-slot', () => {
		const { container } = renderUI(
			<CurrentProvider value={{ value: 'a', onChange: undefined }}>
				<Contents fade={false}>
					<Content value="a">Content A</Content>
				</Contents>
			</CurrentProvider>,
		)

		expect(container.querySelector('[data-slot="test-contents"]')).toBeInTheDocument()
	})

	it('Content renders matching value', () => {
		renderUI(
			<CurrentProvider value={{ value: 'a', onChange: undefined }}>
				<Contents fade={false}>
					<Content value="a">Content A</Content>
					<Content value="b">Content B</Content>
				</Contents>
			</CurrentProvider>,
		)

		expect(screen.getByText('Content A')).toBeInTheDocument()

		expect(screen.queryByText('Content B')).not.toBeInTheDocument()
	})

	it('Content renders all when no value set', () => {
		renderUI(
			<CurrentProvider value={{ value: undefined, onChange: undefined }}>
				<Contents fade={false}>
					<Content value="a">A</Content>
					<Content value="b">B</Content>
				</Contents>
			</CurrentProvider>,
		)

		expect(screen.getByText('A')).toBeInTheDocument()

		expect(screen.getByText('B')).toBeInTheDocument()
	})
})
