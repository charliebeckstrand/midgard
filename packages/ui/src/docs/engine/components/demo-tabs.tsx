'use client'

import type { ReactNode } from 'react'
import {
	Tab,
	TabContent,
	TabContents,
	type TabContentsProps,
	TabList,
	type TabProps,
	Tabs,
	type TabsProps,
} from '../../../components/tabs'
import { useDemoRoute } from '../demo-route'
import { preloadDemo } from '../registry'
import { navigate } from '../router'
import { demoHref } from '../routes'

/**
 * Route-driven tab group for a demo folder's `layout.tsx`: selection mirrors
 * the active tab route, and selecting a tab navigates to its sub-route
 * (`/modules/grid` → `/modules/grid/sorting`). Compose `<DemoTab>` triggers in
 * a `TabList` and place the routed page in a {@link DemoTabPanel}:
 *
 * ```tsx
 * export function Layout({ children }: { children: ReactNode }) {
 * 	return (
 * 		<DemoTabs>
 * 			<TabList aria-label="Grid examples">
 * 				<DemoTab to="">Variants</DemoTab>
 * 				<DemoTab to="sorting">Sorting</DemoTab>
 * 			</TabList>
 * 			<DemoTabPanel>{children}</DemoTabPanel>
 * 		</DemoTabs>
 * 	)
 * }
 * ```
 */
export function DemoTabs({
	children,
	...props
}: Omit<TabsProps, 'value' | 'defaultValue' | 'onValueChange'>) {
	const route = useDemoRoute()

	return (
		<Tabs
			value={route?.tab ?? ''}
			onValueChange={(value) => {
				if (route) navigate(demoHref(route.demo, value ?? ''))
			}}
			{...props}
		>
			{children}
		</Tabs>
	)
}

/**
 * One tab trigger wired to a tab route: `to` is the tab's slug (`''` for the
 * demo's index page). Hover or focus prefetches the tab's chunk via the Tab
 * preload latch, so the panel is usually ready by the click.
 */
export function DemoTab({
	to = '',
	...props
}: { to?: string } & Omit<TabProps, 'value' | 'current' | 'id' | 'onPreload'>) {
	const route = useDemoRoute()

	return (
		<Tab
			value={to}
			onPreload={() => {
				if (route) preloadDemo(route.demo.id, to)
			}}
			{...props}
		/>
	)
}

/**
 * The panel slot a layout places its routed page (`children`) in. A single
 * always-active `TabContent` keyed to the current tab keeps the Tab/panel ARIA
 * pair auto-wired while the router swaps what renders inside.
 */
export function DemoTabPanel({
	children,
	...props
}: { children: ReactNode } & Omit<TabContentsProps, 'children'>) {
	const route = useDemoRoute()

	return (
		<TabContents fade={false} {...props}>
			<TabContent value={route?.tab ?? ''}>{children}</TabContent>
		</TabContents>
	)
}

/**
 * The layout a tabbed demo gets when its folder has no `layout.tsx`: a plain
 * tab bar over the routed page, tabs from the registry (index first, then
 * alphabetical). Renders bare children for a single-page demo.
 *
 * @internal
 */
export function DefaultDemoLayout({ children }: { children: ReactNode }) {
	const route = useDemoRoute()

	if (!route || route.demo.tabs.length === 0) return children

	return (
		<DemoTabs>
			<TabList aria-label={`${route.demo.name} sections`}>
				{route.demo.tabs.map((tab) => (
					<DemoTab key={tab.slug} to={tab.slug}>
						{tab.name}
					</DemoTab>
				))}
			</TabList>
			<DemoTabPanel>{children}</DemoTabPanel>
		</DemoTabs>
	)
}
