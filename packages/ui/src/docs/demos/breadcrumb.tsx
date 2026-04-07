import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

export default function BreadcrumbDemo() {
	return (
		<Example
			code={code`
				import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbSeparator } from 'ui/breadcrumb'

				<Breadcrumb>
				  <BreadcrumbList>
				    <BreadcrumbItem>
				      <BreadcrumbLink href="/">Home</BreadcrumbLink>
				    </BreadcrumbItem>
				    <BreadcrumbSeparator />
				    <BreadcrumbItem>
				      <BreadcrumbLink href="/components">Components</BreadcrumbLink>
				    </BreadcrumbItem>
				    <BreadcrumbSeparator />
				    <BreadcrumbItem>
				      <BreadcrumbLink current>Breadcrumb</BreadcrumbLink>
				    </BreadcrumbItem>
				  </BreadcrumbList>
				</Breadcrumb>
			`}
		>
			<Breadcrumb>
				<BreadcrumbList>
					<BreadcrumbItem>
						<BreadcrumbLink href="#breadcrumb">Home</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink href="#breadcrumb">Components</BreadcrumbLink>
					</BreadcrumbItem>
					<BreadcrumbSeparator />
					<BreadcrumbItem>
						<BreadcrumbLink current>Breadcrumb</BreadcrumbLink>
					</BreadcrumbItem>
				</BreadcrumbList>
			</Breadcrumb>
		</Example>
	)
}
