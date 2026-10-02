import {
	DescriptionDetails,
	DescriptionList,
	DescriptionTerm,
} from '../../../components/description-list'
import { Axes } from '../../engine'

export const meta = { name: 'Description list' }

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
