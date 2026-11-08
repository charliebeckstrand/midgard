import { Heading } from 'ui/heading'
import { ElectionList } from '@/components/election-list'
import { PageFrame } from '@/components/page-frame'
import { listedElections } from '@/utilities/trail'

/** Every election of the registry: live ones first, then upcoming, then past. */
export default function Page() {
	return (
		<PageFrame crumbs={[{ label: 'Elections' }]}>
			<Heading level={1}>Elections</Heading>

			<ElectionList elections={listedElections()} />
		</PageFrame>
	)
}
