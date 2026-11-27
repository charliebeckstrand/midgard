import { useSearchParams } from 'react-router'
import { useHydrated } from 'ui/hooks'
import {
	Pagination,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from 'ui/pagination'

const TOTAL_PAGES = 5

// Each control is a link to a page of the results, so the page is in the URL.
// A link to a page that does not exist is a disabled button.
export default function Links() {
	const [params] = useSearchParams()

	const hydrated = useHydrated()

	// The build renders the page with no query, so the HTML shows the first
	// page. The hydration render must agree with it, so the page in the URL
	// applies in the render after hydration.
	const requested = hydrated ? Number(params.get('page')) : 1

	// A page that is not in the range shows the first page.
	const page =
		Number.isInteger(requested) && requested >= 1 && requested <= TOTAL_PAGES ? requested : 1

	const href = (to: number) => `/pagination?page=${to}`

	return (
		<Pagination aria-label="Pages of results">
			{page > 1 ? <PaginationPrevious href={href(page - 1)} /> : <PaginationPrevious disabled />}
			<PaginationList>
				{Array.from({ length: TOTAL_PAGES }, (_, index) => index + 1).map((item) => (
					<PaginationPage key={item} href={href(item)} current={item === page}>
						{item}
					</PaginationPage>
				))}
			</PaginationList>
			{page < TOTAL_PAGES ? <PaginationNext href={href(page + 1)} /> : <PaginationNext disabled />}
		</Pagination>
	)
}
