import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbSeparator,
} from '../../components/breadcrumb'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

const breadcrumbExampleCode = `
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
`

export default function BreadcrumbDemo() {
	return (
		<Example code={breadcrumbExampleCode}>
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
