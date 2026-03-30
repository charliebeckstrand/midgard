'use client'

import { cn } from '../../core'
import { ActiveIndicator, ActiveIndicatorScope, useActiveIndicator } from '../../primitives'
import {
	tabGroupVariants,
	tabListVariants,
	tabPanelsVariants,
	tabPanelVariants,
	tabVariants,
} from './variants'

export type TabGroupProps = React.ComponentPropsWithoutRef<'div'>

export type TabListProps = React.ComponentPropsWithoutRef<'div'>

export type TabProps = {
	current?: boolean
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>

export type TabPanelsProps = React.ComponentPropsWithoutRef<'div'>

export type TabPanelProps = React.ComponentPropsWithoutRef<'div'>

export function TabGroup({ className, ...props }: TabGroupProps) {
	return <div data-slot="tab-group" className={cn(tabGroupVariants(), className)} {...props} />
}

export function TabList({ className, children, ...props }: TabListProps) {
	return (
		<ActiveIndicatorScope>
			<div data-slot="tab-list" className={cn(tabListVariants(), className)} {...props}>
				{children}
			</div>
		</ActiveIndicatorScope>
	)
}

export function Tab({ current, className, children, ...props }: TabProps) {
	const indicator = useActiveIndicator()

	return (
		<button
			data-slot="tab"
			data-current={current ? '' : undefined}
			type="button"
			className={cn(tabVariants(), className)}
			{...indicator.tapHandlers}
			{...props}
		>
			<span className="relative z-10">{children}</span>
			{current && (
				<ActiveIndicator
					ref={indicator.ref}
					className="inset-x-0 -bottom-px top-auto h-0.5 rounded-full bg-zinc-950 dark:bg-white"
				/>
			)}
		</button>
	)
}

export function TabPanels({ className, ...props }: TabPanelsProps) {
	return <div data-slot="tab-panels" className={cn(tabPanelsVariants(), className)} {...props} />
}

export function TabPanel({ className, ...props }: TabPanelProps) {
	return <div data-slot="tab-panel" className={cn(tabPanelVariants(), className)} {...props} />
}
