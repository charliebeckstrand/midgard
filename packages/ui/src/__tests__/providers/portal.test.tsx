import { describe, expect, it } from 'vitest'
import { type PortalContainer, usePortalContainer } from '../../primitives/portal'
import { PortalProvider } from '../../providers/portal'
import { renderUI, screen } from '../helpers'

function PortalProbe({ container }: { container?: PortalContainer }) {
	const resolved = usePortalContainer(container)

	return <span data-testid="resolved">{resolved?.id ?? 'none'}</span>
}

describe('PortalProvider', () => {
	it('renders children', () => {
		renderUI(
			<PortalProvider container={null}>
				<span>content</span>
			</PortalProvider>,
		)

		expect(screen.getByText('content')).toBeInTheDocument()
	})

	it('broadcasts the container through usePortalContainer()', () => {
		const target = document.createElement('div')

		target.id = 'portal-root'

		renderUI(
			<PortalProvider container={target}>
				<PortalProbe />
			</PortalProvider>,
		)

		expect(screen.getByTestId('resolved')).toHaveTextContent('portal-root')
	})

	it('falls back to null when no provider wraps the consumer', () => {
		renderUI(<PortalProbe />)

		expect(screen.getByTestId('resolved')).toHaveTextContent('none')
	})

	it('lets an explicit container override the provider value', () => {
		const provided = document.createElement('div')

		provided.id = 'provider-root'

		const local = document.createElement('div')

		local.id = 'local-root'

		renderUI(
			<PortalProvider container={provided}>
				<PortalProbe container={local} />
			</PortalProvider>,
		)

		expect(screen.getByTestId('resolved')).toHaveTextContent('local-root')
	})
})
