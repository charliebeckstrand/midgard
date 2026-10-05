import { JsonTree, type JsonTreeProps } from 'ui/json-tree'
import { sample } from './sample.ts'

export default function JsonTreePlayground(props: JsonTreeProps) {
	return <JsonTree {...props} data={sample} />
}
