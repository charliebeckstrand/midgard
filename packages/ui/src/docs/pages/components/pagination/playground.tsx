import { useState } from 'react'
import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
	type PaginationProps,
} from 'ui/pagination'

const totalPages = 10

function getVisiblePages(current: number, total: number): (number | 'gap')[] {
	if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

	if (current <= 3) return [1, 2, 3, 4, 'gap', total - 1, total]

	if (current >= total - 2) return [1, 2, 'gap', total - 3, total - 2, total - 1, total]

	return [1, 'gap', current - 1, current, current + 1, 'gap', total]
}

export default function PaginationPlayground(props: PaginationProps) {
	const [page, setPage] = useState(1)

	const visible = getVisiblePages(page, totalPages)

	return (
		<Pagination {...props}>
			<PaginationPrevious onClick={() => setPage(page - 1)} disabled={page === 1} />
			<PaginationList>
				{visible.map((item, index) =>
					item === 'gap' ? (
						<PaginationGap key={`gap-after-${visible[index - 1]}`} />
					) : (
						<PaginationPage key={item} current={item === page} onClick={() => setPage(item)}>
							{item}
						</PaginationPage>
					),
				)}
			</PaginationList>
			<PaginationNext onClick={() => setPage(page + 1)} disabled={page === totalPages} />
		</Pagination>
	)
}
