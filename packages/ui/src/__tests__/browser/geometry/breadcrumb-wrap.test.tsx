import { Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../../components/breadcrumb'
import { getSlot, renderUI, screen } from '../../helpers'

/**
 * A long breadcrumb trail stays inside a narrow box.
 *
 * The list was a flex row with no wrap, so a trail wider than its box ran past the edge of a
 * narrow screen. A user at 320 CSS pixels then had to scroll on two axes (WCAG 1.4.10).
 *
 * Rides the real browser because the claim is a computed one: jsdom lays out no box.
 */
describe('a long breadcrumb trail (real browser)', () => {
	it('wraps inside its box', () => {
		const crumbs = ['Home', 'Projects', 'Infrastructure', 'Deployments', 'Production']

		const { container } = renderUI(
			<div style={{ width: 240 }}>
				<Breadcrumb>
					<BreadcrumbList>
						{crumbs.map((crumb, index) => (
							<Fragment key={crumb}>
								{index > 0 && <BreadcrumbSeparator />}
								<BreadcrumbItem>
									<BreadcrumbLink href={`/${crumb}`} current={index === crumbs.length - 1}>
										{crumb}
									</BreadcrumbLink>
								</BreadcrumbItem>
							</Fragment>
						))}
					</BreadcrumbList>
				</Breadcrumb>
			</div>,
		)

		const list = getSlot(container, 'breadcrumb-list')

		expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)

		const top = (crumb: string) => screen.getByText(crumb).getBoundingClientRect().top

		expect(top('Production')).toBeGreaterThan(top('Home'))
	})
})
