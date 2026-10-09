import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Example } from '../../../../kit/index.ts'
import ClientInfiniteScroll from './client-infinite-scroll.tsx'
import GroupedWindow from './grouped-window.tsx'
import MasterDetailWindow from './master-detail-window.tsx'
import ServerInfiniteScroll from './server-infinite-scroll.tsx'

export default function VirtualizationTab() {
	return (
		<Tabs defaultValue="client">
			<TabList aria-label="Virtualization type">
				<Tab value="client">Client</Tab>
				<Tab value="server">Server</Tab>
			</TabList>
			<TabContents animate={false}>
				<TabContent value="client">
					<Stack gap="xl">
						<Example of={ClientInfiniteScroll} />
						<Example of={GroupedWindow} />
						<Example of={MasterDetailWindow} />
					</Stack>
				</TabContent>
				<TabContent value="server">
					<Example of={ServerInfiniteScroll} />
				</TabContent>
			</TabContents>
		</Tabs>
	)
}
