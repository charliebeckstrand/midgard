import {
	DescriptionDetails,
	DescriptionList,
	type DescriptionListProps,
	DescriptionTerm,
} from 'ui/description-list'

export default function DescriptionListPlayground(props: DescriptionListProps) {
	return (
		<DescriptionList {...props}>
			<DescriptionTerm>Name</DescriptionTerm>
			<DescriptionDetails>Wade Cooper</DescriptionDetails>
			<DescriptionTerm>Email</DescriptionTerm>
			<DescriptionDetails>wade@example.com</DescriptionDetails>
			<DescriptionTerm>Role</DescriptionTerm>
			<DescriptionDetails>Administrator</DescriptionDetails>
		</DescriptionList>
	)
}
