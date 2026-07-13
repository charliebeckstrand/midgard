import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { Suspense, use, useState } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayoutHeader } from 'ui/layouts'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import type { DocMeta } from '../engine'
import { randomSeed } from '../engine/usage'
import { ApiPanel } from './api-panel'
import { OverviewTab } from './overview-tab'
import { loadDoc } from './registry'
import { setParam } from './router'
import { UsageTab } from './usage-tab'

const TAB_VALUES = ['overview', 'usage', 'api'] as const

type TabValue = (typeof TAB_VALUES)[number]

function activeTab(search: URLSearchParams): TabValue {
	const tab = search.get('tab')

	return TAB_VALUES.includes(tab as TabValue) ? (tab as TabValue) : 'overview'
}

/**
 * The route body for one doc: its name, description, and generated import above
 * the Overview | Usage | API reference segment tabs, with the active tab in the
 * URL (`?tab=`) so any view is linkable. Overview and Usage share one
 * page-owned seed, so their synthesized renders match and re-roll together.
 */
export function DocPage({
	meta,
	search,
	locked,
	onToggleLocked,
}: {
	meta: DocMeta
	search: URLSearchParams
	locked: boolean
	onToggleLocked: () => void
}) {
	const doc = use(loadDoc(meta.id))

	const tab = activeTab(search)

	// One ephemeral seed per mount backs the "different every visit" default; a
	// pinned `?seed=` overrides it. Owned here so the Overview and Usage tabs
	// synthesize the same example.
	const [seed] = useState(randomSeed)

	return (
		<>
			<SidebarLayoutHeader>
				<Flex align="center" gap="md">
					<Button
						variant="bare"
						className="max-lg:hidden"
						aria-label={locked ? 'Float sidebar' : 'Lock sidebar'}
						onClick={onToggleLocked}
					>
						<Icon icon={locked ? <PanelLeftDashed /> : <PanelLeft />} />
					</Button>
					<Heading>{doc.meta.name}</Heading>
				</Flex>
			</SidebarLayoutHeader>
			<Stack gap="lg">
				<Markdown className="max-w-prose">{doc.meta.description}</Markdown>
				<Tabs
					variant="segment"
					value={tab}
					onValueChange={(value) => value && setParam('tab', value === 'overview' ? null : value)}
				>
					<TabList aria-label="Documentation views">
						<Tab value="overview">Overview</Tab>
						<Tab value="usage">Usage</Tab>
						<Tab value="api">API reference</Tab>
					</TabList>
					<TabContents mount="lazy" className="pt-6">
						<TabContent value="overview">
							<OverviewTab doc={doc} search={search} seed={seed} />
						</TabContent>
						<TabContent value="usage">
							<Suspense fallback={null}>
								<UsageTab meta={doc.meta} search={search} seed={seed} />
							</Suspense>
						</TabContent>
						<TabContent value="api">
							<Suspense fallback={null}>
								<ApiPanel meta={doc.meta} />
							</Suspense>
						</TabContent>
					</TabContents>
				</Tabs>
			</Stack>
		</>
	)
}
