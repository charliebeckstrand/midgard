import { useState } from 'react'
import { Grid } from 'ui/grid'
import { makePerson, type Person, serverColumns } from '../data.tsx'

const TOTAL = 200

// The rows from `offset` of the mock server, up to `limit` rows.
function rowsAt(offset: number, limit: number): Person[] {
	return Array.from({ length: Math.max(0, Math.min(limit, TOTAL - offset)) }, (_, i) =>
		makePerson(offset + i + 1),
	)
}

// The request for the next page resolves after a short time.
const fetchPage = (offset: number) =>
	new Promise<Person[]>((resolve) => setTimeout(() => resolve(rowsAt(offset, 25)), 500))

export default function ServerInfiniteScroll() {
	const [rows, setRows] = useState(() => rowsAt(0, 25))

	const [loadingMore, setLoadingMore] = useState(false)

	const loadMore = () => {
		setLoadingMore(true)

		fetchPage(rows.length).then((page) => {
			setRows((current) => [...current, ...page])

			setLoadingMore(false)
		})
	}

	// The first page comes with the page, and the client adds each next page.
	// `loadingMore` stops a second request while one runs, and `totalRows`
	// gives the count of the whole set.
	return (
		<Grid
			columns={serverColumns}
			rows={rows}
			getKey={(row) => row.id}
			virtualize
			maxHeight="320px"
			footer={{ rowTotal: true }}
			infiniteScroll={{
				onLoadMore: loadMore,
				totalRows: TOTAL,
				loadingMore,
				loadingIndicator: true,
				stableColumnWidths: true,
				endMessage: 'No more results',
			}}
		/>
	)
}
