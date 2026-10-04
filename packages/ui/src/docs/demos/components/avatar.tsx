import { Avatar, AvatarGroup } from '../../../components/avatar'
import { Axes, Example, valueLabel } from '../../engine'

const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export default function Demo() {
	return (
		<>
			<Axes of="Avatar" render={(props) => <Avatar {...props} initials="AB" />} />

			<Example title="Colors">
				{colors.map((color) => (
					<Avatar key={color} color={color} initials={valueLabel(color)[0]} />
				))}
			</Example>

			<Axes
				of="AvatarGroup"
				title="Avatar group"
				render={(props) => (
					<AvatarGroup {...props}>
						<Avatar initials="AB" />
						<Avatar initials="CD" />
						<Avatar initials="EF" />
						<Avatar initials="GH" />
						<Avatar initials="+3" alt="3 more" />
					</AvatarGroup>
				)}
			/>
		</>
	)
}
