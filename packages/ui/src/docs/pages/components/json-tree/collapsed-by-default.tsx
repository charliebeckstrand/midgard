import { JsonTree } from 'ui/json-tree'
import { sample } from './sample.ts'

export default function CollapsedByDefault() {
	return <JsonTree data={sample} defaultExpandDepth={0} />
}
