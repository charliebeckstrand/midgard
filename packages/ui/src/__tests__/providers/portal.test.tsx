import { type ComponentProps, useEffect } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

describe('UIProvider bindings', () => {
	function MountProbe({ onMount }: { onMount: () => void }) {
		useEffect(onMount, [onMount])

		return <PortalProbe />
	}

	it('keeps its subtree mounted when a binding arrives after the first render', () => {
		const onMount = vi.fn()

		const target = document.createElement('div')

		target.id = 'late-root'

		const link = (props: ComponentProps<'a'>) => <a {...props} />

		const { rerender } = renderUI(
			<UIProvider>
				<MountProbe onMount={onMount} />
			</UIProvider>,
		)

		rerender(
			<UIProvider portalContainer={target} link={link}>
				<MountProbe onMount={onMount} />
			</UIProvider>,
		)

		expect(screen.getByTestId('resolved')).toHaveTextContent('late-root')

		expect(onMount).toHaveBeenCalledOnce()
	})

	it('keeps the outer bindings that a nested provider omits', () => {
		const target = document.createElement('div')

		target.id = 'outer-root'

		renderUI(
			<UIProvider portalContainer={target}>
				<UIProvider>
					<PortalProbe />
				</UIProvider>
			</UIProvider>,
		)

		expect(screen.getByTestId('resolved')).toHaveTextContent('outer-root')
	})
})
