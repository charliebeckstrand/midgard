import { Example } from '../../../../kit/index.ts'
import ClientPagination from './client-pagination.tsx'
import ServerPagination from './server-pagination.tsx'

export default function PaginationTab() {
	return (
		<>
			<Example of={ServerPagination} />
			<Example of={ClientPagination} />
		</>
	)
}
