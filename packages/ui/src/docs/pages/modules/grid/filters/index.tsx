import { Example } from '../../../../kit/index.ts'
import ColumnFilters from './column-filters.tsx'
import DateNumberAndBooleanFilters from './date-number-and-boolean-filters.tsx'
import Search from './search.tsx'
import SearchHighlight from './search-highlight.tsx'

export default function FiltersTab() {
	return (
		<>
			<Example of={Search} />
			<Example of={SearchHighlight} />
			<Example of={ColumnFilters} />
			<Example of={DateNumberAndBooleanFilters} />
		</>
	)
}
