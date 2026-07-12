import { PanelLeft, PanelLeftDashed } from 'lucide-react'
import { Suspense, use } from 'react'
import { Button } from 'ui/button'
import { Flex } from 'ui/flex'
import { Heading } from 'ui/heading'
import { Icon } from 'ui/icon'
import { SidebarLayoutHeader } from 'ui/layouts'
import { Markdown } from 'ui/markdown'
import { Stack } from 'ui/stack'
import { Tab, TabContent, TabContents, TabList, Tabs } from 'ui/tabs'
import { Text } from 'ui/text'
import type { DocMeta } from '../engine/contracts'
import { ApiPanel } from './api-panel'
import { PreviewTab } from './preview-tab'
import { loadDoc } from './registry'
import { setParam } from './router'

const TAB_VALUES = ['preview', 'usage', 'api'] as const

type TabValue = (typeof TAB_VALUES)[number]

function activeTab(search: URLSearchParams): TabValue {
	const tab = search.get('tab')

	return TAB_VALUES.includes(tab as TabValue) ? (tab as TabValue) : 'preview'
}

/**
 * The route body for one doc: its name and description above the
 * Preview | Usage | API reference segment tabs, with the active tab in the
 * URL (`?tab=`) so any view is linkable. Usage and API panels are placeholders
 * until their engines land.
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
					onValueChange={(value) => value && setParam('tab', value === 'preview' ? null : value)}
				>
					<TabList aria-label="Documentation views">
						<Tab value="preview">Preview</Tab>
						<Tab value="usage">Usage</Tab>
						<Tab value="api">API reference</Tab>
					</TabList>
					<TabContents mount="lazy" className="pt-6">
						<TabContent value="preview">
							<PreviewTab doc={doc} />
						</TabContent>
						<TabContent value="usage">
							<Text severity="muted">The Usage tab arrives with the usage engine.</Text>
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
