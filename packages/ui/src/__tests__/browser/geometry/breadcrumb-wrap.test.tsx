import { Fragment } from 'react'
import { describe, expect, it } from 'vitest'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../../components/breadcrumb'
import { present, renderUI } from '../../helpers'

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

		const list = present(container.querySelector('[data-slot="breadcrumb-list"]'), 'list')

		expect(list.scrollWidth).toBeLessThanOrEqual(list.clientWidth)

		const links = Array.from(container.querySelectorAll('[data-slot="breadcrumb-link"]'))

		const top = (index: number) =>
			present(links[index], `crumb ${index}`).getBoundingClientRect().top

		expect(top(links.length - 1)).toBeGreaterThan(top(0))
	})
})
