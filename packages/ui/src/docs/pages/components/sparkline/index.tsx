import api from 'virtual:docs/api/components/sparkline'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import Animated from './animated.tsx'
import SparklinePlayground from './playground.tsx'

export default function SparklinePage() {
	return (
		<>
			<Playground of={SparklinePlayground} api={api} omit={['animate']} />
			<Example of={Animated} />
			<ApiTable api={api} />
		</>
	)
}
