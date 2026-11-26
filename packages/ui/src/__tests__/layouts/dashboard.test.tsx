import { createRef, useEffect } from 'react'
import { hydrateRoot, type Root } from 'react-dom/client'
import { renderToString } from 'react-dom/server'
import { describe, expect, it, onTestFinished, vi } from 'vitest'
import { DashboardLayout } from '../../layouts/dashboard'
import { adaptive } from '../../utilities/responsive'
import { act, bySlot, fireEvent, renderUI, screen, stubMatchMedia } from '../helpers'

/** A filter that counts the copies of it whose effects are live. */
function liveFilters() {
	const live = { count: 0 }

	function Filter() {
		useEffect(() => {
			live.count += 1

			return () => {
				live.count -= 1
			}
		}, [])

		return <div>filter content</div>
	}

	return { live, Filter }
}

describe('DashboardLayout', () => {
	it('lays the filters beside the column from the breakpoint that `layout` names', () => {
		const { container } = renderUI(
			<DashboardLayout
				filters={<div>filter content</div>}
				layout={adaptive({ compact: 'drawer', medium: 'inline' })}
			>
				content
			</DashboardLayout>,
		)

		const rail = screen.getByText('filter content').parentElement

		expect(rail).toHaveClass('hidden', 'sm:flex')

		expect(container.querySelector('[data-slot="filters"]')?.parentElement).toHaveClass(
			'flex-col',
			'sm:flex-row',
		)
	})

	it('renders its own anchor and takes the attributes and ref of its <div>', () => {
		const ref = createRef<HTMLDivElement>()

		const { container } = renderUI(
			<DashboardLayout ref={ref} id="reports">
				content
			</DashboardLayout>,
		)

		const root = bySlot(container, 'dashboard-layout')

		expect(root).toBe(ref.current)

		expect(root?.id).toBe('reports')
	})

	it('does not render the filters trigger when filters are not provided', () => {
		renderUI(<DashboardLayout>content</DashboardLayout>)

		expect(screen.queryByRole('button', { name: 'Filters' })).not.toBeInTheDocument()
	})

	it('opens the mobile filters drawer when the trigger is clicked', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

		expect(screen.getByText('Filters', { selector: 'h2,h3,[role="heading"]' })).toBeInTheDocument()
	})

	it('tells assistive technology that the filters button opens a dialog, and its state', () => {
		renderUI(<DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>)

		const trigger = screen.getByRole('button', { name: 'Filters' })

		expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')

		expect(trigger).toBeCollapsed()

		fireEvent.click(trigger)

		expect(trigger).toBeExpanded()
	})

	it('reports the mobile filter drawer opening', () => {
		const onOpenChange = vi.fn()

		renderUI(
			<DashboardLayout filters={<div>filter content</div>} onOpenChange={onOpenChange}>
				content
			</DashboardLayout>,
		)

		expect(onOpenChange).not.toHaveBeenCalled()

		fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

		expect(onOpenChange).toHaveBeenCalledExactlyOnceWith(true)
	})

	it('runs the effects of the drawer copy of the filters only, in the drawer layout', () => {
		const { live, Filter } = liveFilters()

		renderUI(<DashboardLayout filters={<Filter />}>content</DashboardLayout>)

		// The inline copy rests in a hidden Activity: in the DOM, and with no live effect.
		expect(screen.getByText('filter content')).toBeInTheDocument()

		expect(live.count).toBe(0)

		fireEvent.click(screen.getByRole('button', { name: 'Filters' }))

		expect(live.count).toBe(1)
	})

	it('runs the effects of the inline copy of the filters in the inline layout', () => {
		stubMatchMedia(() => true)

		const { live, Filter } = liveFilters()

		renderUI(<DashboardLayout filters={<Filter />}>content</DashboardLayout>)

		expect(screen.getByText('filter content')).toBeVisible()

		expect(live.count).toBe(1)
	})

	it('renders the inline copy of the filters on the server, and hydrates with no mismatch', async () => {
		const tree = <DashboardLayout filters={<div>filter content</div>}>content</DashboardLayout>

		const html = renderToString(tree)

		expect(html).toContain('filter content')

		const container = document.createElement('div')

		container.innerHTML = html

		document.body.append(container)

		onTestFinished(() => container.remove())

		const onRecoverableError = vi.fn()

		let root: Root | undefined

		await act(async () => {
			root = hydrateRoot(container, tree, { onRecoverableError })
		})

		onTestFinished(() => act(() => root?.unmount()))

		expect(onRecoverableError).not.toHaveBeenCalled()

		// The jsdom viewport is the drawer layout, so the render after hydration hides the copy.
		expect(screen.getByText('filter content')).not.toBeVisible()
	})
})
