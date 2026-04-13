import type React from 'react'
import { Box } from '../components/box'
import { Divider } from '../components/divider'
import { Stack } from '../components/stack'

export type SettingsLayoutProps = React.PropsWithChildren<{
	heading?: React.ReactNode
	tabs?: React.ReactNode
	actions?: React.ReactNode
}>

export function SettingsLayout({ heading, tabs, children, actions }: SettingsLayoutProps) {
	return (
		<Stack gap={0} className="w-full bg-white dark:bg-zinc-950">
			{heading && (
				<Box px={6} className="shrink-0 pt-6">
					{heading}
				</Box>
			)}

			{tabs && (
				<>
					<Box px={6} className="shrink-0 pt-4">
						{tabs}
					</Box>
					<Divider soft />
				</>
			)}

			<Box p={6} className="flex-1">
				{children}
			</Box>

			{actions && (
				<>
					<Divider soft />
					<Box px={6} py={4} className="shrink-0">
						{actions}
					</Box>
				</>
			)}
		</Stack>
	)
}
