import { describe, expect, it } from 'vitest'
import { AuthLayout } from '../../layouts/auth'
import { renderUI } from '../helpers'

describe('AuthLayout', () => {
	it('renders a main element', () => {
		const { container } = renderUI(<AuthLayout>content</AuthLayout>)

		const main = container.querySelector('main')

		expect(main).toBeInTheDocument()
	})
})
