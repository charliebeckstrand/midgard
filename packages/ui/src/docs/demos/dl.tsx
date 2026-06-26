import { Example } from 'docs'
import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../components/dl'

export const meta = { name: 'DL' }

export function Demo() {
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
