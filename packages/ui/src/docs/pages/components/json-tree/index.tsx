import api from 'virtual:docs/api/components/json-tree'
import { ApiTable, Example, Playground } from '../../../kit/index.ts'
import ArraysOfPrimitives from './arrays-of-primitives.tsx'
import CollapsedByDefault from './collapsed-by-default.tsx'
import ExpandAllLevels from './expand-all-levels.tsx'
import JsonTreePlayground from './playground.tsx'
import Search from './search.tsx'
import SearchWithFilter from './search-with-filter.tsx'

export default function JsonTreePage() {
	return (
		<>
			<Playground of={JsonTreePlayground} api={api} />
			<Example of={ExpandAllLevels} />
			<Example of={CollapsedByDefault} />
			<Example of={Search} />
			<Example of={SearchWithFilter} />
			<Example of={ArraysOfPrimitives} />
			<ApiTable api={api} />
		</>
	)
}
