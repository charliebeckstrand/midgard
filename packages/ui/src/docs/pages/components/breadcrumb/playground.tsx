import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	type BreadcrumbProps,
	BreadcrumbSeparator,
} from 'ui/breadcrumb'

export default function BreadcrumbPlayground(props: BreadcrumbProps) {
	return (
		<Breadcrumb {...props}>
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
	)
}
