import { describe, expect, it } from 'vitest'
import { Toast } from '../../components/toast'
import { renderUI, screen } from '../helpers'

describe('Toast', () => {
	it('renders children', () => {
		renderUI(
			<Toast>
				<span>App content</span>
			</Toast>,
		)

		expect(screen.getByText('App content')).toBeInTheDocument()
	})

	it('renders a toast viewport in the document', () => {
		renderUI(
			<Toast>
				<span>content</span>
			</Toast>,
		)

		const viewport = document.querySelector('[data-slot="toast-viewport"]')

		expect(viewport).toBeInTheDocument()
	})

	it('sets aria-live on viewport', () => {
		renderUI(
			<Toast>
				<span>content</span>
			</Toast>,
		)

		const viewport = document.querySelector('[data-slot="toast-viewport"]')

		expect(viewport).toHaveAttribute('aria-live', 'polite')
	})
})
