import { Example } from '../../../../kit/index.ts'
import IkeaDistributionNetwork from './ikea-distribution-network.tsx'
import LongHaulCorridors from './long-haul-corridors.tsx'

export default function RouteTab() {
	return (
		<>
			<Example of={IkeaDistributionNetwork} surface />
			<Example of={LongHaulCorridors} surface />
		</>
	)
}
