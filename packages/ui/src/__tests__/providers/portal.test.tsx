import { describe, expect, it } from 'vitest'
import { Dialog } from '../../components/dialog'
import { type PortalContainer, usePortalContainer } from '../../primitives/portal'
import { UIProvider } from '../../providers/ui'
import { attach, renderUI, screen } from '../helpers'

function PortalProbe({ container }: { container?: PortalContainer }) {
	const resolved = usePortalContainer(container)

	return <span data-testid="resolved">{resolved?.id ?? 'none'}</span>
}

describe('UIProvider portalContainer', () => {
	it('broadcasts the container through usePortalContainer()', () => {
		const target = document.createElement('div')

		target.id = 'portal-root'

		renderUI(
			<UIProvider portalContainer={target}>
				<PortalProbe />
			</UIProvider>,
		)

		expect(screen.getByTestId('resolved')).toHaveTextContent('portal-root')
	})

	it('falls back to null when no provider wraps the consumer', () => {
		renderUI(<PortalProbe />)

		expect(screen.getByTestId('resolved')).toHaveTextContent('none')
	})

	it('mounts a portaled overlay into the provider container', () => {
		const target = attach(document.createElement('div'))

		target.id = 'app-portal'

		renderUI(
			<UIProvider portalContainer={target}>
				<Dialog open onOpenChange={() => {}}>
					Portaled dialog
				</Dialog>
			</UIProvider>,
		)

		expect(target.contains(screen.getByRole('dialog'))).toBe(true)
	})

	it('lets an explicit container override the provider value', () => {
		const provided = document.createElement('div')

		provided.id = 'provider-root'

		const local = document.createElement('div')

		local.id = 'local-root'

		renderUI(
			<UIProvider portalContainer={provided}>
				<PortalProbe container={local} />
			</UIProvider>,
		)

		expect(screen.getByTestId('resolved')).toHaveTextContent('local-root')
	})
})
