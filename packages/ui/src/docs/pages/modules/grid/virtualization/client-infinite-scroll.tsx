import { useState } from 'react'
import { Grid } from 'ui/grid'
import { columns, manyPeople } from '../data.tsx'

export default function ClientInfiniteScroll() {
	const [count, setCount] = useState(20)

	// Each row is in memory. The grid shows a slice of the rows that grows as
	// the scroll nears its end, and `hasMore` stops it at the last row.
	return (
		<Grid
			columns={columns}
			rows={manyPeople.slice(0, count)}
			getKey={(row) => row.id}
			virtualize
			maxHeight="320px"
			infiniteScroll={{
				onLoadMore: () => setCount((current) => Math.min(current + 20, manyPeople.length)),
				hasMore: count < manyPeople.length,
			}}
		/>
	)
}
