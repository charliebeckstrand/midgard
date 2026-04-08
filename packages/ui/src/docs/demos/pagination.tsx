'use client'

import { useState } from 'react'
import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'
import { code } from '../code'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

const totalPages = 10

function getVisiblePages(current: number, total: number): (number | 'gap')[] {
	if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

	if (current <= 3) return [1, 2, 3, 4, 'gap', total - 1, total]
	if (current >= total - 2) return [1, 2, 'gap', total - 3, total - 2, total - 1, total]

	return [1, 'gap', current - 1, current, current + 1, 'gap', total]
}

export default function PaginationDemo() {
	const [page, setPage] = useState(1)

	const visible = getVisiblePages(page, totalPages)

	return (
		<Example
			code={code`
				import { Pagination, PaginationGap, PaginationList, PaginationNext, PaginationPage, PaginationPrevious } from 'ui/pagination'

				<Pagination>
					<PaginationPrevious href="?page=1" />
					<PaginationList>
						<PaginationPage href="?page=1">1</PaginationPage>
						<PaginationPage href="?page=2" current>2</PaginationPage>
						<PaginationPage href="?page=3">3</PaginationPage>
						<PaginationGap />
						<PaginationPage href="?page=9">9</PaginationPage>
						<PaginationPage href="?page=10">10</PaginationPage>
					</PaginationList>
					<PaginationNext href="?page=3" />
				</Pagination>
			`}
		>
			<Pagination>
				<PaginationPrevious
					onClick={() => setPage((p) => Math.max(1, p - 1))}
					disabled={page === 1}
				/>
				<PaginationList>
					{visible.map((p, i) =>
						p === 'gap' ? (
							<PaginationGap key={`gap-after-${visible[i - 1]}`} />
						) : (
							<PaginationPage key={p} current={p === page} onClick={() => setPage(p)}>
								{p}
							</PaginationPage>
						),
					)}
				</PaginationList>
				<PaginationNext
					onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
					disabled={page === totalPages}
				/>
			</Pagination>
		</Example>
	)
}
