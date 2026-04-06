import {
	Pagination,
	PaginationGap,
	PaginationList,
	PaginationNext,
	PaginationPage,
	PaginationPrevious,
} from '../../components/pagination'
import { Example } from '../example'

export const meta = { category: 'Navigation' }

export default function PaginationDemo() {
	return (
		<Example
			code={`import { Pagination, PaginationGap, PaginationList, PaginationNext, PaginationPage, PaginationPrevious } from 'ui/pagination'

<Pagination>
  <PaginationPrevious href="/page/2" />
  <PaginationList>
    <PaginationPage href="/page/1">1</PaginationPage>
    <PaginationPage href="/page/2">2</PaginationPage>
    <PaginationPage href="/page/3" current>3</PaginationPage>
    <PaginationGap />
    <PaginationPage href="/page/8">8</PaginationPage>
    <PaginationPage href="/page/9">9</PaginationPage>
    <PaginationPage href="/page/10">10</PaginationPage>
  </PaginationList>
  <PaginationNext href="/page/4" />
</Pagination>`}
		>
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
		</Example>
	)
}
