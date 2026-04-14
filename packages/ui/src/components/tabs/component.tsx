'use client'

import { useMemo, useRef } from 'react'
import { cn } from '../../core'
import { useRovingFocus } from '../../hooks'
import {
	ActiveIndicator,
	ActiveIndicatorScope,
	CurrentProvider,
	createCurrentContent,
	useActiveIndicator,
	useCurrent,
	useCurrentContext,
} from '../../primitives'
import { segmentControlVariants, segmentItemVariants } from '../segment/variants'
import { TabsProvider, type TabsVariant, useTabsContext } from './context'
import { k, ks } from './variants'

// ── Tabs ────────────────────────────────────────────────

export type TabsProps = React.ComponentPropsWithoutRef<'div'> & {
	value?: string
	defaultValue?: string
	onValueChange?: (value: string | undefined) => void
	variant?: TabsVariant
}

export function Tabs({
	value,
	defaultValue,
	onValueChange,
	variant = 'tab',
	className,
	children,
	...props
}: TabsProps) {
	const [ctx] = useCurrent({ value, defaultValue, onChange: onValueChange })

	const tabsCtx = useMemo(() => ({ variant }), [variant])

	return (
		<CurrentProvider value={ctx}>
			<TabsProvider value={tabsCtx}>
				<div data-slot="tab-group" className={className} {...props}>
					{children}
				</div>
			</TabsProvider>
		</CurrentProvider>
	)
}

// ── TabList ─────────────────────────────────────────────

export type TabListProps = React.ComponentPropsWithoutRef<'div'>

export function TabList({ className, children, ...props }: TabListProps) {
	const tabsCtx = useTabsContext()

	const isSegment = tabsCtx?.variant === 'segment'

	const ref = useRef<HTMLDivElement>(null)

	const handleKeyDown = useRovingFocus(ref, {
		itemSelector: 'button[data-slot="tab"]:not(:disabled)',
		orientation: 'horizontal',
	})

	return (
		<ActiveIndicatorScope>
			<div
				ref={ref}
				data-slot="tab-list"
				role="tablist"
				onKeyDown={handleKeyDown}
				className={cn(isSegment ? segmentControlVariants() : k.list, className)}
				{...props}
			>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}

// ── Tab ─────────────────────────────────────────────────

export type TabProps = {
	value?: string
	current?: boolean
	/** Stable identifier linking this tab to its panel via aria-controls. */
	id?: string
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'id' | 'value'>

export function Tab({
	value,
	current: currentProp,
	id,
	className,
	children,
	onClick,
	...props
}: TabProps) {
	const ctx = useCurrentContext()

	const tabsCtx = useTabsContext()

	const indicator = useActiveIndicator()

	const isSegment = tabsCtx?.variant === 'segment'

	const current = currentProp ?? (value !== undefined && ctx?.value === value)

	function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
		onClick?.(e)

		if (value !== undefined) {
			ctx?.onChange?.(value)
		}
	}

	return (
		<button
			data-slot="tab"
			data-current={current ? '' : undefined}
			role="tab"
			id={id}
			aria-selected={current ?? false}
			aria-controls={id ? `${id}-panel` : undefined}
			tabIndex={current ? 0 : -1}
			type="button"
			className={cn(
				isSegment ? segmentItemVariants() : k.tab,
				isSegment && current && ks.segmentCurrent,
				className,
			)}
			onClick={handleClick}
			{...indicator.tapHandlers}
			{...props}
		>
			<span className="relative z-10">{children}</span>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className={cn(isSegment ? ks.indicator : k.indicator)}
				/>
			)}
		</button>
	)
}

// ── TabContents / TabContent ────────────────────────────

const { Contents: TabContents, Content: TabContent } = createCurrentContent('tab')

export { TabContents, TabContent }

export type TabContentsProps = React.ComponentPropsWithoutRef<typeof TabContents>
export type TabContentProps = React.ComponentPropsWithoutRef<typeof TabContent>

// ── TabPanels / TabPanel (backwards-compatible) ─────────

export type TabPanelsProps = React.ComponentPropsWithoutRef<'div'>

export function TabPanels({ className, ...props }: TabPanelsProps) {
	return <div data-slot="tab-panels" className={className} {...props} />
}

export type TabPanelProps = {
	/** Must match the corresponding Tab's id to link via aria-labelledby. */
	id?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'id'>

export function TabPanel({ id, className, ...props }: TabPanelProps) {
	return (
		<div
			data-slot="tab-panel"
			role="tabpanel"
			id={id ? `${id}-panel` : undefined}
			aria-labelledby={id}
			className={className}
			{...props}
		/>
	)
}
