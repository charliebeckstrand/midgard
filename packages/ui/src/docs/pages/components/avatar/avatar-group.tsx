import { Avatar, AvatarGroup } from 'ui/avatar'
import { Stack } from 'ui/stack'
import { members } from './members.ts'

const sizes = ['sm', 'md', 'lg'] as const

export default function AvatarGroupExample() {
	return (
		<Stack gap="md">
			{sizes.map((size) => (
				<AvatarGroup key={size} size={size} role="group" aria-label="Project members">
					{members.slice(0, 4).map((member) => (
						<Avatar
							key={member.name}
							color={member.color}
							initials={member.initials}
							alt={member.name}
						/>
					))}
					<Avatar initials="+3" alt="3 more" />
				</AvatarGroup>
			))}
		</Stack>
	)
}
