import { Avatar } from '../../components/avatar'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Data Display' }

const avatars = [
	{ initials: 'AB', size: 'size-8' },
	{ initials: 'CD', size: 'size-10' },
	{ initials: 'EF', size: 'size-12' },
	{ initials: 'GH', size: 'size-14' },
] as const

export default function AvatarDemo() {
	return (
		<Example
			code={code`
				import { Avatar } from 'ui/avatar'

				${avatars.map((a) => `<Avatar initials="${a.initials}" className="${a.size}" />`)}
			`}
		>
			<div className="flex items-center gap-4">
				{avatars.map((a) => (
					<Avatar key={a.initials} initials={a.initials} className={a.size} />
				))}
			</div>
		</Example>
	)
}
