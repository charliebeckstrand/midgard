import { Avatar } from 'ui/avatar'
import { members } from './members.ts'

export default function Colors() {
	return members.map((member) => (
		<Avatar key={member.name} color={member.color} initials={member.initials} alt={member.name} />
	))
}
