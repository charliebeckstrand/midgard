import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../components/dl'
import { Example } from '../components/example'

export const meta = { name: 'DL', category: 'Data Display' }

export default function DLDemo() {
	return (
		<Example title="Default">
			<DescriptionList>
				<DescriptionTerm>Name</DescriptionTerm>
				<DescriptionDetails>Wade Cooper</DescriptionDetails>
				<DescriptionTerm>Email</DescriptionTerm>
				<DescriptionDetails>wade@example.com</DescriptionDetails>
				<DescriptionTerm>Role</DescriptionTerm>
				<DescriptionDetails>Administrator</DescriptionDetails>
				<DescriptionTerm>Status</DescriptionTerm>
				<DescriptionDetails>Active</DescriptionDetails>
			</DescriptionList>
		</Example>
	)
}
