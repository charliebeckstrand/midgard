import { Fragment } from 'react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'

const trail = ['Home', 'Workspaces', 'Acme Inc.', 'Projects', 'Website redesign', 'Assets']

// `collapse` keeps a long trail on one line. The crumbs at the start give way
// to a `…` mark, which goes to the nearest crumb that gave way. Drag the end
// border of the frame to see the trail give way.
export default function Collapse() {
	return (
		<Breadcrumb collapse aria-label="Folder path">
			<BreadcrumbList>
				{trail.map((crumb) => (
					<Fragment key={crumb}>
						<BreadcrumbItem>
							<BreadcrumbLink href="#">{crumb}</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator />
					</Fragment>
				))}
				<BreadcrumbItem>
					<BreadcrumbLink current>Hero images</BreadcrumbLink>
				</BreadcrumbItem>
			</BreadcrumbList>
		</Breadcrumb>
	)
}
