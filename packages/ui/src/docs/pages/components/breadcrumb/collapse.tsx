import { Fragment } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'

const trail = ['Home', 'Projects', 'Website redesign', 'Design', 'Components', 'Navigation']

// The trail stays on one line. The first crumbs give way to a `…` mark when
// the row cannot hold them. Make the frame narrower to see more crumbs go.
export default function Collapse() {
	return (
		<div className="max-w-sm">
			<Breadcrumb collapse aria-label="Project path">
				<BreadcrumbList>
					{trail.slice(0, -1).map((crumb) => (
						<Fragment key={crumb}>
							<BreadcrumbItem>
								<BreadcrumbLink href="#">{crumb}</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator />
						</Fragment>
					))}
					<BreadcrumbItem>
						<BreadcrumbLink current>{trail.at(-1)}</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</div>
	)
}
