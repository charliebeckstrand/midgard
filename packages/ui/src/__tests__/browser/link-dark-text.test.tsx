import { afterEach, describe, expect, it } from 'vitest'
import { Badge } from '../../components/badge'
import { Button } from '../../components/button'
import { Link } from '../../components/link'
import { renderUI, screen } from '../helpers'

/**
 * A host that renders through Link keeps its own text color in dark mode.
 *
 * The default color of Link wrote `text-current dark:text-current`. A merge with the
 * classes of a solid Button or Badge, whose text color has no `dark:` form, dropped
 * `text-current` and kept `dark:text-current`. In dark mode the text then took the color
 * around the host: white on an amber fill.
 *
 * Rides the real browser because the claim is a computed one: jsdom loads no stylesheet.
 */
describe('a host that renders through Link, in dark mode (real browser)', () => {
	afterEach(() => {
		document.documentElement.classList.remove('dark')
	})

	/** The computed text color of the element with the test id `id`. */
	function color(id: string) {
		return getComputedStyle(screen.getByTestId(id)).color
	}

	it.each([false, true])(
		'gives a solid link the text color of its plain form (dark: %s)',
		(dark) => {
			if (dark) document.documentElement.classList.add('dark')

			renderUI(
				<div style={{ color: 'rgb(255, 255, 255)' }}>
					<Button data-testid="button" color="amber">
						Plain
					</Button>
					<Button data-testid="button-link" href="/x" color="amber">
						Link
					</Button>
					<Badge data-testid="badge" color="amber">
						Plain
					</Badge>
					<Badge data-testid="badge-link" href="/y" render={<Link href="" />} color="amber">
						Link
					</Badge>
				</div>,
			)

			expect(color('button-link')).toBe(color('button'))

			expect(color('badge-link')).toBe(color('badge'))
		},
	)

	it('keeps a text color that a consumer gives a Link', () => {
		document.documentElement.classList.add('dark')

		renderUI(
			<div style={{ color: 'rgb(255, 255, 255)' }}>
				<span data-testid="reference" className="text-red-600">
					Reference
				</span>
				<Link data-testid="link" href="/z" className="text-red-600">
					Red
				</Link>
			</div>,
		)

		expect(color('link')).toBe(color('reference'))
	})
})
