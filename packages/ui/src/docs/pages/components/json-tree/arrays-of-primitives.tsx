import { JsonTree } from 'ui/json-tree'

export default function ArraysOfPrimitives() {
	return (
		<JsonTree
			data={['alpha', 'beta', 'gamma', 1, 2, 3, true, false, null]}
			defaultExpandDepth={Number.POSITIVE_INFINITY}
		/>
	)
}
