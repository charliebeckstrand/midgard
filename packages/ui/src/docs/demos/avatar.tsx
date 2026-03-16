import { Avatar } from '../../components/avatar'

export const meta = { category: 'Data Display' }

export default function AvatarDemo() {
	return (
		<div className="flex items-center gap-4">
			<Avatar initials="AB" className="size-8" />
			<Avatar initials="CD" className="size-10" />
			<Avatar initials="EF" className="size-12" />
			<Avatar initials="GH" className="size-14" />
		</div>
	)
}
