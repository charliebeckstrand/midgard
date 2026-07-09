import { useMemo, useState } from 'react'
import { Stack } from '../../../../components/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from '../../../../components/tabs'
import { Grid } from '../../../../modules/grid'
import { code, Example } from '../../../engine'
import { columns, manyPeople, type Person, roles } from './_data'

// Client-side infinite scroll: the whole set is held in memory, and the grid renders a
// growing slice of it through the virtual window. `onLoadMore` lifts the slice
// synchronously as the scroll nears the loaded end; `hasMore` stops it once the
// slice reaches the full set.
const ClientInfiniteScrollExample = () => {
	const [count, setCount] = useState(20)

	const rows = useMemo(() => manyPeople.slice(0, count), [count])

	return (
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			virtualize
			maxHeight="320px"
			infiniteScroll={{
				onLoadMore: () => setCount((c) => Math.min(c + 20, manyPeople.length)),
				hasMore: count < manyPeople.length,
			}}
		/>
	)
}

const SERVER_TOTAL = 200

// A page of the "server" set: rows [offset, offset + limit), capped at the total.
const makeServerRows = (offset: number, limit: number): Person[] =>
	Array.from({ length: Math.max(0, Math.min(limit, SERVER_TOTAL - offset)) }, (_, i) => {
		const id = offset + i + 1

		return {
			id,
			name: `Person ${id}`,
			email: `person${id}@example.com`,
			role: roles[id % roles.length] ?? 'Developer',
			status: id % 3 === 0 ? 'inactive' : 'active',
		}
	})

// Stand-in for a paged server fetch: resolve the next page after a short delay.
const fetchServerRows = (offset: number): Promise<Person[]> =>
	new Promise((resolve) => {
		setTimeout(() => resolve(makeServerRows(offset, 25)), 500)
	})

// Server-side rendered infinite scroll: the first page stands in for the server-rendered
// initial rows, and the client appends each subsequent page as the scroll nears
// the end. `loadingMore` holds a pending flag across the async fetch — it won't
// re-request until the batch lands, and `showLoadingIndicator` opts the trailing
// skeleton row in. `stableColumnWidths` holds the columns steady as batches append,
// and `endMessage` closes the list once the whole set has loaded. The backend's
// `totalRows` derives `hasMore`, keeps `aria-rowcount` determinate, and reports
// the real set through the footer's row total.
const ServerInfiniteScrollExample = () => {
	const [rows, setRows] = useState<Person[]>(() => makeServerRows(0, 25))

	const [loadingMore, setLoadingMore] = useState(false)

	const loadMore = () => {
		setLoadingMore(true)

		fetchServerRows(rows.length).then((page) => {
			setRows((prev) => [...prev, ...page])

			setLoadingMore(false)
		})
	}

	return (
		<Grid
			columns={columns}
			rows={rows}
			getKey={(row) => row.id}
			virtualize
			maxHeight="320px"
			footer={{ rowTotal: true }}
			infiniteScroll={{
				onLoadMore: loadMore,
				totalRows: SERVER_TOTAL,
				loadingMore,
				showLoadingIndicator: true,
				stableColumnWidths: true,
				endMessage: 'No more results',
			}}
		/>
	)
}

export function Demo() {
	return (
		<Tabs defaultValue="Client">
			<TabList aria-label="Virtualization type">
				<Tab value="Client">Client</Tab>
				<Tab value="Server">Server</Tab>
			</TabList>
			<TabContents fade={false}>
				<TabContent value="Client">
					<Stack gap="xl">
						<Example title="Client infinite scroll" code={code`<Grid virtualize />`}>
							<ClientInfiniteScrollExample />
						</Example>
					</Stack>
				</TabContent>

				<TabContent value="Server">
					<Stack gap="xl">
						<Example
							title="Server infinite scroll"
							code={code`<Grid virtualize infiniteScroll={{ onLoadMore, totalRows, loadingMore, showLoadingIndicator: true, stableColumnWidths: true, endMessage: 'No more results' }} />`}
						>
							<ServerInfiniteScrollExample />
						</Example>
					</Stack>
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
