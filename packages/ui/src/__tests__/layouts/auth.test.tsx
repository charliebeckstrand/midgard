import { describe, expect, it } from 'vitest'
import { AuthLayout } from '../../layouts/auth'
import { renderUI, screen } from '../helpers'

describe('AuthLayout', () => {
	it('renders a main element', () => {
		const { container } = renderUI(<AuthLayout>content</AuthLayout>)

		const el = container.querySelector('main')

		expect(el).toBeInTheDocument()
	})

	it('renders children', () => {
		renderUI(<AuthLayout>Hello</AuthLayout>)

		expect(screen.getByText('Hello')).toBeInTheDocument()
	})
})
