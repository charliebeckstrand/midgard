import { DescriptionDetails, DescriptionList, DescriptionTerm } from '../../../components/dl'
import { Axes } from '../../engine'

export const meta = { name: 'DL' }

export function Demo() {
	return (
		<Axes
			of="DescriptionList"
			render={(props) => (
				<div className="w-96 max-w-full">
					<DescriptionList {...props}>
						<DescriptionTerm>Name</DescriptionTerm>
						<DescriptionDetails>Wade Cooper</DescriptionDetails>
						<DescriptionTerm>Email</DescriptionTerm>
						<DescriptionDetails>wade@example.com</DescriptionDetails>
						<DescriptionTerm>Role</DescriptionTerm>
						<DescriptionDetails>Administrator</DescriptionDetails>
					</DescriptionList>
				</div>
			)}
		/>
	)
}
