import { Search } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from '../../../components/button'
import { Icon } from '../../../components/icon'
import { Input } from '../../../components/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '../../../components/tooltip'
import { present, renderUI } from '../../helpers'

/**
 * The box of a Button holds in each form.
 *
 * A link Button was a classless `<span>` around the anchor, so the `span` was the box that a
 * parent laid out, and `flex-1` on the button did nothing. A loading icon-only button showed the
 * spinner beside the icon and widened. An `sr-only` name counted as a label, so the button lost
 * its square. In an Input affix, a TooltipTrigger renamed the anchor of a non-bare Button, so
 * the affix lost the inset of a button.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('the box of a Button (real browser)', () => {
	/** The box of the element with the test id `id`. */
	function box(container: HTMLElement, id: string) {
		return present(container.querySelector(`[data-testid="${id}"]`), id).getBoundingClientRect()
	}

	it('gives a link button the flex box of a button', () => {
		const { container } = renderUI(
			<div style={{ display: 'flex', gap: 8, width: 300 }}>
				<Button data-testid="link" href="/a" className="flex-1">
					A
				</Button>
				<Button data-testid="button" type="button" className="flex-1">
					B
				</Button>
			</div>,
		)

		expect(box(container, 'link').width).toBe(box(container, 'button').width)
	})

	it('keeps the square of an icon-only button while it loads, and with an sr-only name', () => {
		const { container } = renderUI(
			<div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
				<Button data-testid="idle" type="button" aria-label="Search">
					<Icon icon={<Search />} />
				</Button>
				<Button data-testid="busy" type="button" aria-label="Search" loading>
					<Icon icon={<Search />} />
				</Button>
				<Button data-testid="named" type="button">
					<Icon icon={<Search />} />
					<span className="sr-only">Search</span>
				</Button>
			</div>,
		)

		const idle = box(container, 'idle')

		expect(idle.width).toBe(idle.height)

		expect(box(container, 'busy').width).toBe(idle.width)

		expect(box(container, 'named').width).toBe(idle.width)

		expect(box(container, 'named').height).toBe(idle.height)
	})

	it('keeps the inset of a button in an Input affix inside a TooltipTrigger', () => {
		const { container } = renderUI(
			<div>
				<Input
					data-testid="plain"
					aria-label="Plain"
					suffix={
						<Button type="button" variant="outline" size="xs">
							Go
						</Button>
					}
				/>
				<Input
					data-testid="tipped"
					aria-label="Tipped"
					suffix={
						<Tooltip>
							<TooltipTrigger>
								<Button type="button" variant="outline" size="xs">
									Go
								</Button>
							</TooltipTrigger>
							<TooltipContent>Search</TooltipContent>
						</Tooltip>
					}
				/>
			</div>,
		)

		const padding = (label: string) => {
			const input = present(container.querySelector(`[aria-label="${label}"]`), label)

			const frame = present(input.closest('[data-slot="control-frame"]'), `${label} frame`)

			const suffix = present(frame.querySelector('[data-slot="suffix"]'), `${label} suffix`)

			return getComputedStyle(suffix).paddingInlineEnd
		}

		expect(padding('Tipped')).toBe(padding('Plain'))
	})
})
