import api from 'virtual:docs/api/primitives/ready-reveal'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Form from './form.tsx'
import SkeletonPlayground from './playground.tsx'
import ProfileCard from './profile-card.tsx'
import SkeletonVariants from './skeleton-variants.tsx'

export default function SkeletonPage() {
	return (
		<>
			<Playground of={SkeletonPlayground} api={api} omit={['ready']} />
			<Example of={SkeletonVariants} />
			<Example of={Form} />
			<Example of={ProfileCard} />
			<ApiTable api={api} />
		</>
	)
}
