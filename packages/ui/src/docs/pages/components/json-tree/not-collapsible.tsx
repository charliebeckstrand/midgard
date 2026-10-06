import { JsonTree } from 'ui/json-tree'
import { sample } from './sample.ts'

export default function NotCollapsible() {
	return <JsonTree data={sample} collapsible={false} />
}
