'use client'

import { cn } from '../../core'
import { ActiveIndicator, ActiveIndicatorScope, useActiveIndicator } from '../../primitives'
import { katachi } from '../../recipes'

const k = katachi.tabs

export type TabGroupProps = React.ComponentPropsWithoutRef<'div'>

export type TabListProps = React.ComponentPropsWithoutRef<'div'>

export type TabProps = {
	current?: boolean
	/** Stable identifier linking this tab to its panel via aria-controls. */
	id?: string
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className' | 'id'>

export type TabPanelsProps = React.ComponentPropsWithoutRef<'div'>

export type TabPanelProps = {
	/** Must match the corresponding Tab's id to link via aria-labelledby. */
	id?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'id'>

export function TabGroup({ className, ...props }: TabGroupProps) {
	return <div data-slot="tab-group" className={className} {...props} />
}

export function TabList({ className, children, ...props }: TabListProps) {
	return (
		<ActiveIndicatorScope>
			<div data-slot="tab-list" role="tablist" className={cn(k.list, className)} {...props}>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}

export function Tab({ current, id, className, children, ...props }: TabProps) {
	const indicator = useActiveIndicator()

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
			className={cn(k.tab, className)}
			{...indicator.tapHandlers}
			{...props}
		>
			<span className="relative z-10">{children}</span>
			{current && <ActiveIndicator ref={indicator.ref} className={cn(k.indicator)} />}
		</button>
	)
}

export function TabPanels({ className, ...props }: TabPanelsProps) {
	return <div data-slot="tab-panels" className={className} {...props} />
}

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
