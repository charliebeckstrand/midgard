import { Profiler } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from '../../../components/button'
import { Popover, PopoverContent, PopoverTrigger } from '../../../components/popover'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { frames, renderUI, screen, waitFor } from '../../helpers'
import { PIXEL } from '../../helpers/geometry/tolerance'
import { hydrateServerRender } from '../../helpers/hydrate'

/**
 * A floating panel anchors to its reference with CSS anchor positioning. The
 * browser then moves the panel with the reference when a scroll container
 * scrolls, in the same frame. A panel that only floating-ui moves follows the
 * reference one frame late, after the `scroll` event, and it shakes during a
 * scroll that runs off the main thread.
 *
 * The test stops each `scroll` event before it gets to floating-ui, and it
 * gives floating-ui an `IntersectionObserver` that reports nothing, so no
 * position pass runs (`autoUpdate` reads both). The panel stays on the
 * reference only if the browser moves it. The jsdom suite mocks
 * `@floating-ui/react`, so the case runs here.
 */
describe('a floating panel in a scroll container (real floating engine)', () => {
	/** Stops each `scroll` event in the capture phase, before any listener of floating-ui. */
	const blockScroll = (event: Event) => event.stopImmediatePropagation()

	/** An observer that reports nothing, so a move of the reference starts no position pass. */
	class SilentIntersectionObserver {
		observe() {}

		unobserve() {}

		disconnect() {}

		takeRecords() {
			return []
		}
	}

	afterEach(() => {
		window.removeEventListener('scroll', blockScroll, { capture: true })

		window.scrollTo(0, 0)
	})

	/** The anchor names in the inline `anchor-name` list of `element`. */
	function anchorNames(element: HTMLElement) {
		return element.style
			.getPropertyValue('anchor-name')
			.split(',')
			.map((name) => name.trim())
			.filter(Boolean)
	}

	it('moves with its trigger when no position pass runs', async () => {
		vi.stubGlobal('IntersectionObserver', SilentIntersectionObserver)

		renderUI(
			<div data-testid="scroller" style={{ height: 300, marginTop: 200, overflow: 'auto' }}>
				<div style={{ height: 150 }} />

				<Tooltip open placement="top">
					<TooltipTrigger>
						<Button>Details</Button>
					</TooltipTrigger>

					<TooltipContent>More about this</TooltipContent>
				</Tooltip>

				<div style={{ height: 2000 }} />
			</div>,
		)

		const trigger = screen.getByRole('button', { name: 'Details' })

		const panel = await screen.findByRole('tooltip')

		await frames(2)

		const offset = () => panel.getBoundingClientRect().top - trigger.getBoundingClientRect().top

		const before = offset()

		window.addEventListener('scroll', blockScroll, { capture: true })

		screen.getByTestId('scroller').scrollTop = 40

		await frames(2)

		expect(offset()).toBeNear(before, PIXEL)
	})

	it('renders nothing while a scroll moves the trigger', async () => {
		let commits = 0

		renderUI(
			<div data-testid="scroller" style={{ height: 300, marginTop: 200, overflow: 'auto' }}>
				<div style={{ height: 150 }} />

				<Profiler id="tooltip" onRender={() => commits++}>
					<Tooltip open placement="top">
						<TooltipTrigger>
							<Button>Details</Button>
						</TooltipTrigger>

						<TooltipContent>More about this</TooltipContent>
					</Tooltip>
				</Profiler>

				<div style={{ height: 2000 }} />
			</div>,
		)

		const trigger = screen.getByRole('button', { name: 'Details' })

		const panel = await screen.findByRole('tooltip')

		await frames(2)

		const offset = () => panel.getBoundingClientRect().top - trigger.getBoundingClientRect().top

		const before = offset()

		const settled = commits

		const scroller = screen.getByTestId('scroller')

		// Each step stays clear of the top edge, so the panel does not flip.
		for (const scrollTop of [10, 20, 30, 40]) {
			scroller.scrollTop = scrollTop

			await frames()
		}

		expect(commits).toBe(settled)

		expect(offset()).toBeNear(before, PIXEL)
	})

	it('follows a trigger in a fixed header when the page scrolls', async () => {
		renderUI(
			<>
				<div style={{ position: 'fixed', top: 100, left: 100 }}>
					<Tooltip open placement="bottom">
						<TooltipTrigger>
							<Button>Details</Button>
						</TooltipTrigger>

						<TooltipContent>More about this</TooltipContent>
					</Tooltip>
				</div>

				<div style={{ height: 3000 }} />
			</>,
		)

		const trigger = screen.getByRole('button', { name: 'Details' })

		const panel = await screen.findByRole('tooltip')

		await frames(2)

		const offset = () => panel.getBoundingClientRect().top - trigger.getBoundingClientRect().top

		const before = offset()

		window.scrollTo(0, 200)

		await waitFor(() => expect(offset()).toBeNear(before, PIXEL))
	})

	it('places the panel at the trigger under a transformed ancestor', async () => {
		renderUI(
			<div style={{ transform: 'translate(200px, 100px) scale(1.5)', transformOrigin: '0 0' }}>
				<Tooltip open placement="bottom">
					<TooltipTrigger>
						<Button>Details</Button>
					</TooltipTrigger>

					<TooltipContent>More about this</TooltipContent>
				</Tooltip>
			</div>,
		)

		const trigger = screen.getByRole('button', { name: 'Details' })

		const panel = await screen.findByRole('tooltip')

		await frames(2)

		const box = trigger.getBoundingClientRect()

		const placed = panel.getBoundingClientRect()

		// The panel is centered below the trigger, at the gap of the tooltip.
		expect(placed.left + placed.width / 2).toBeNear(box.left + box.width / 2, PIXEL)

		expect(placed.top - box.bottom).toBeNear(8, PIXEL)

		// Chromium includes the transform in the anchor, so the panel anchors.
		expect(panel.style.getPropertyValue('position-anchor')).not.toBe('')
	})

	it('gives the panels of two hydrated roots their own anchors', async () => {
		function Island({ label }: { label: string }) {
			return (
				<Popover defaultOpen>
					<PopoverTrigger>
						<Button>{label}</Button>
					</PopoverTrigger>

					<PopoverContent aria-label={`${label} panel`}>Body</PopoverContent>
				</Popover>
			)
		}

		// A hydrated root takes its ids from the place in its own tree, so the two
		// islands give the same ids.
		hydrateServerRender(<Island label="First" />)

		hydrateServerRender(<Island label="Second" />)

		const names = await Promise.all(
			['First', 'Second'].map(async (label) => {
				const trigger = screen.getByRole('button', { name: label })

				const dialog = await screen.findByRole('dialog', { name: `${label} panel` })

				// The role is on the body of the panel, inside the positioned wrapper.
				const anchor = () =>
					dialog
						.closest<HTMLElement>('[style*="position-anchor"]')
						?.style.getPropertyValue('position-anchor')

				await waitFor(() => expect(anchorNames(trigger)).toEqual([anchor()]))

				return anchorNames(trigger)
			}),
		)

		expect(names[0]).not.toEqual(names[1])
	})

	it('keeps the anchor name of each panel on a shared trigger', async () => {
		function Harness({ popover }: { popover: boolean }) {
			return (
				<Popover open={popover}>
					<Tooltip open>
						<TooltipTrigger>
							<PopoverTrigger>
								<Button>Filters</Button>
							</PopoverTrigger>
						</TooltipTrigger>

						<TooltipContent>Show the filters</TooltipContent>
					</Tooltip>

					<PopoverContent aria-label="Filters">Body</PopoverContent>
				</Popover>
			)
		}

		const { rerender } = renderUI(<Harness popover />)

		const trigger = screen.getByRole('button', { name: 'Filters' })

		const tooltip = await screen.findByRole('tooltip')

		await screen.findByRole('dialog')

		await waitFor(() => expect(anchorNames(trigger)).toHaveLength(2))

		const tooltipAnchor = tooltip.style.getPropertyValue('position-anchor')

		expect(anchorNames(trigger)).toContain(tooltipAnchor)

		rerender(<Harness popover={false} />)

		await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

		expect(anchorNames(trigger)).toEqual([tooltipAnchor])
	})
})
