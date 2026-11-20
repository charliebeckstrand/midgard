import { ArrowRight } from 'lucide-react'
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'
import { type Icons, UIProvider } from 'ui/providers/ui'

// An app keeps its map in a module constant, so that the map does not change
// at each render. Each value is an element of the icon library of the app.
const ICONS: Icons = { ChevronRight: <ArrowRight /> }

export default function ReplacedIcons() {
	return (
		<UIProvider icons={ICONS}>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="#">Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="#">Components</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink current>Breadcrumb</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</UIProvider>
	)
}
