import { QueryBuilder, type QueryBuilderProps } from 'ui/query'
import { fields, seed } from './data.ts'

export default function QueryPlayground(props: QueryBuilderProps) {
	return <QueryBuilder {...props} fields={fields} defaultValue={seed} />
}
