import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'

export const meta = { category: 'Navigation' }

export default function PaginationDemo() {
	return (
		<Pagination>
			<PaginationPrevious href="#pagination" />
			<PaginationList>
				<PaginationPage href="#pagination">1</PaginationPage>
				<PaginationPage href="#pagination">2</PaginationPage>
				<PaginationPage href="#pagination" current>
					3
				</PaginationPage>
				<PaginationGap />
				<PaginationPage href="#pagination">8</PaginationPage>
				<PaginationPage href="#pagination">9</PaginationPage>
				<PaginationPage href="#pagination">10</PaginationPage>
			</PaginationList>
			<PaginationNext href="#pagination" />
		</Pagination>
	)
}
