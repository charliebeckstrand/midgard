import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Menu, MenuContent, MenuItem, MenuTrigger } from '../../../components/menu'
import { frames, renderUI, screen, waitFor } from '../../helpers'

/**
 * A panel whose trigger scrolls out of its scroll container hides, and comes
 * back when the trigger does. The hide middleware runs only in the real
 * floating engine, because the jsdom suite mocks `@floating-ui/react`.
 */
describe('a Menu whose trigger scrolls out of view (real floating engine)', () => {
	function visibility(panel: Element) {
		return getComputedStyle(panel).visibility
	}

	it('hides the panel while the trigger is out of view', async () => {
		renderUI(
			<div data-testid="scroller" style={{ height: 200, marginTop: 300, overflow: 'auto' }}>
				<div style={{ height: 50 }} />

				<Menu placement="bottom-start" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>One</MenuItem>

						<MenuItem>Two</MenuItem>
					</MenuContent>
				</Menu>

				<div style={{ height: 2000 }} />
			</div>,
		)

		await frames()

		const panel = screen.getByRole('menu')

		await waitFor(() => expect(visibility(panel)).toBe('visible'))

		// The trigger leaves the top of the scroller, but stays in the viewport.
		const scroller = screen.getByTestId('scroller')

		scroller.scrollTop = 130

		await waitFor(() => expect(visibility(panel)).toBe('hidden'))

		scroller.scrollTop = 0

		await waitFor(() => expect(visibility(panel)).toBe('visible'))
	})

	it('does not make the document scroll while the trigger is far down a scroller', async () => {
		renderUI(
			<div style={{ height: 200, overflow: 'auto' }}>
				<div style={{ height: 3000 }} />

				<Menu placement="bottom-start" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>One</MenuItem>
					</MenuContent>
				</Menu>
			</div>,
		)

		await frames()

		const panel = screen.getByRole('menu', { hidden: true })

		await waitFor(() => expect(visibility(panel)).toBe('hidden'))

		const root = document.documentElement

		expect(root.scrollHeight).toBe(root.clientHeight)
	})

	it('hides the panel while the trigger is under a sticky bar of the scroller', async () => {
		renderUI(
			<div data-testid="scroller" style={{ height: 300, marginTop: 300, overflow: 'auto' }}>
				<div
					data-sticky-bar=""
					style={{ position: 'sticky', top: 0, height: 60, zIndex: 1, background: 'gray' }}
				/>

				<div style={{ height: 50 }} />

				<Menu placement="bottom-start" defaultOpen>
					<MenuTrigger>
						<Button>Open</Button>
					</MenuTrigger>

					<MenuContent>
						<MenuItem>One</MenuItem>

						<MenuItem>Two</MenuItem>
					</MenuContent>
				</Menu>

				<div style={{ height: 2000 }} />
			</div>,
		)

		await frames()

		const panel = screen.getByRole('menu')

		await waitFor(() => expect(visibility(panel)).toBe('visible'))

		// The trigger is under the bar, but it is in the scroller and in the viewport.
		const scroller = screen.getByTestId('scroller')

		const trigger = screen.getByRole('button', { name: 'Open' })

		scroller.scrollTop =
			trigger.getBoundingClientRect().bottom - scroller.getBoundingClientRect().top - 30

		await waitFor(() => expect(visibility(panel)).toBe('hidden'))

		scroller.scrollTop = 0

		await waitFor(() => expect(visibility(panel)).toBe('visible'))
	})

	/** A scroller with a sticky bar, scrolled so that the top strip holds `strip`. */
	function StickyScroller({ bar, strip }: { bar?: ReactNode; strip?: ReactNode }) {
		return (
			<div style={{ display: 'flex', marginTop: 300 }}>
				<div style={{ width: 120 }}>{strip}</div>

				<div data-testid="scroller" style={{ flex: 1, height: 300, overflow: 'auto' }}>
					<div
						data-sticky-bar=""
						style={{ position: 'sticky', top: 0, height: 60, zIndex: 1, background: 'gray' }}
					>
						{bar}
					</div>

					<div style={{ height: 2000 }} />
				</div>
			</div>
		)
	}

	function OpenMenu() {
		return (
			<Menu placement="bottom-start" defaultOpen>
				<MenuTrigger>
					<Button>Open</Button>
				</MenuTrigger>

				<MenuContent>
					<MenuItem>One</MenuItem>
				</MenuContent>
			</Menu>
		)
	}

	it('keeps the panel of a trigger in the sticky bar in view', async () => {
		renderUI(<StickyScroller bar={<OpenMenu />} />)

		await frames()

		const panel = screen.getByRole('menu')

		screen.getByTestId('scroller').scrollTop = 500

		await frames()

		expect(visibility(panel)).toBe('visible')
	})

	it('keeps the panel of a trigger beside the sticky bar in view', async () => {
		renderUI(<StickyScroller strip={<OpenMenu />} />)

		await frames()

		const panel = screen.getByRole('menu')

		screen.getByTestId('scroller').scrollTop = 500

		await frames()

		expect(visibility(panel)).toBe('visible')
	})

	it('keeps the panel of a trigger on a surface over the sticky bar in view', async () => {
		renderUI(
			<>
				<StickyScroller />

				<div style={{ position: 'fixed', inset: '300px 0 auto 0', height: 60, zIndex: 2 }}>
					<OpenMenu />
				</div>
			</>,
		)

		await frames()

		const panel = screen.getByRole('menu')

		await frames()

		expect(visibility(panel)).toBe('visible')
	})
})
