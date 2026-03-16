import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../components/description-list'

export const meta = { category: 'Data Display' }

export default function DescriptionListDemo() {
	return (
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
	)
}
