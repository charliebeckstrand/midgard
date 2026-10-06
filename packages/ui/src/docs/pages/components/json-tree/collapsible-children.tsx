import { JsonTree } from 'ui/json-tree'
import { sample } from './sample.ts'

export default function CollapsibleChildren() {
	return <JsonTree data={sample} collapsible="children" defaultExpandDepth={0} />
}
