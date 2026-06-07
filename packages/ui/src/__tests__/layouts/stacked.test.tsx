import { createRef } from 'react'
import { describe, expect, it } from 'vitest'
import { StackedLayoutBody, StackedLayoutFooter, StackedLayoutHeader } from '../../layouts/stacked'
import { bySlot, renderUI } from '../helpers'

describe('StackedLayoutHeader', () => {
	it('renders a <header> landmark', () => {
		const { container } = renderUI(<StackedLayoutHeader>content</StackedLayoutHeader>)

		expect(bySlot(container, 'header')?.tagName).toBe('HEADER')
	})
})

describe('StackedLayoutBody', () => {
	it('forwards ref', () => {
		const ref = createRef<HTMLElement>()

		const { container } = renderUI(<StackedLayoutBody ref={ref}>content</StackedLayoutBody>)

		expect(ref.current).toBeInstanceOf(HTMLElement)

		expect(ref.current).toBe(bySlot(container, 'body'))
	})

	it('renders a <main> landmark', () => {
		const { container } = renderUI(<StackedLayoutBody>content</StackedLayoutBody>)

		expect(bySlot(container, 'body')?.tagName).toBe('MAIN')
	})
})

describe('StackedLayoutFooter', () => {
	it('renders a <footer> landmark', () => {
		const { container } = renderUI(<StackedLayoutFooter>content</StackedLayoutFooter>)

		expect(bySlot(container, 'footer')?.tagName).toBe('FOOTER')
	})
})
