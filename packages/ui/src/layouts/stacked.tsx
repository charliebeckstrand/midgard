import type React from 'react'
import { Box } from '../components/box'
import type { ResponsiveGap } from '../components/flex/variants'
import { Stack } from '../components/stack'
import { cn } from '../core'

export type StackedLayoutProps = React.PropsWithChildren<{
	className?: string
	gap?: ResponsiveGap
}>

export function StackedLayout({ gap = 6, children, className }: StackedLayoutProps) {
	return (
		<Stack direction="col" gap={gap} className={cn('min-h-0', className)}>
			{children}
		</Stack>
	)
}

export type StackedLayoutHeaderProps = React.PropsWithChildren<{ className?: string }>

export function StackedLayoutHeader({ children, className }: StackedLayoutHeaderProps) {
	return (
		<Box dataSlot="header" className={cn('shrink-0', className)}>
			{children}
		</Box>
	)
}

export type StackedLayoutBodyProps = React.PropsWithChildren<{
	className?: string
	ref?: React.Ref<HTMLDivElement>
}>

export function StackedLayoutBody({ ref, children, className }: StackedLayoutBodyProps) {
	return (
		<Box ref={ref} dataSlot="body" className={cn('flex-1 min-h-0 overflow-y-auto', className)}>
			{children}
		</Box>
	)
}

export type StackedLayoutFooterProps = React.PropsWithChildren<{ className?: string }>

export function StackedLayoutFooter({ children, className }: StackedLayoutFooterProps) {
	return (
		<Box dataSlot="footer" className={cn('shrink-0', className)}>
			{children}
		</Box>
	)
}
