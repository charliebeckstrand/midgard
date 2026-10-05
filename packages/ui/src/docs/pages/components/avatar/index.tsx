import api from 'virtual:docs/api/components/avatar'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import AvatarGroupExample from './avatar-group.tsx'
import Colors from './colors.tsx'
import AvatarPlayground from './playground.tsx'

export default function AvatarPage() {
	return (
		<>
			<Playground of={AvatarPlayground} api={api} />
			<Example of={Colors} />
			<Example of={AvatarGroupExample} />
			<ApiTable api={api} />
		</>
	)
}
