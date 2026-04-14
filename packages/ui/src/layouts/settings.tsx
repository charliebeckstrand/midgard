import type React from 'react'
import { Box } from '../components/box'
import { Stack } from '../components/stack'
import { cn } from '../core'
import { omote } from '../recipes/omote'

export type SettingsLayoutProps = React.PropsWithChildren<{
	heading?: React.ReactNode
	tabs?: React.ReactNode
	actions?: React.ReactNode
}>

export function SettingsLayout({ heading, tabs, children, actions }: SettingsLayoutProps) {
	return (
		<Stack gap={4} className={cn('w-full', omote.surface)}>
			{heading && <Box className="shrink-0">{heading}</Box>}

			<Stack gap={6}>
				{tabs && <Box className="shrink-0">{tabs}</Box>}

				<Box className="flex-1">{children}</Box>

				{actions && <Box className="shrink-0">{actions}</Box>}
			</Stack>
		</Stack>
	)
}
