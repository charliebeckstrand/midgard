'use client'

import { SlidersHorizontal } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Box } from '../components/box'
import { Button } from '../components/button'
import { Divider } from '../components/divider'
import { Drawer, DrawerBody, DrawerTitle } from '../components/drawer'
import { Icon } from '../components/icon'
import { Stack } from '../components/stack'

export type DashboardLayoutProps = React.PropsWithChildren<{
	filters?: React.ReactNode
}>

export function DashboardLayout({ filters, children }: DashboardLayoutProps) {
	const [open, setOpen] = useState(false)

	const close = useCallback(() => setOpen(false), [])

	useEffect(() => {
		const breakpoint = getComputedStyle(document.documentElement)
			.getPropertyValue('--breakpoint-lg')
			.trim()

		const mql = window.matchMedia(`(min-width: ${breakpoint})`)

		const handler = () => {
			if (mql.matches) setOpen(false)
		}

		mql.addEventListener('change', handler)

		return () => mql.removeEventListener('change', handler)
	}, [])

	return (
		<Stack gap={0} className="w-full bg-white dark:bg-zinc-950">
			{filters && (
				<>
					{/* Filters visible on desktop */}
					<Box p={6} className="shrink-0 max-lg:hidden">
						{filters}
					</Box>

					<Divider soft className="max-lg:hidden" />

					{/* Filters button on mobile */}
					<Box px={6} className="shrink-0 pt-6 lg:hidden">
						<Button variant="outline" onClick={() => setOpen(true)}>
							<Icon icon={<SlidersHorizontal />} />
							Filters
						</Button>
					</Box>

					{/* Filters drawer on mobile */}
					<Drawer open={open} onClose={close}>
						<DrawerTitle>Filters</DrawerTitle>
						<DrawerBody>
							<Stack gap={4}>{filters}</Stack>
						</DrawerBody>
					</Drawer>
				</>
			)}

			<Box p={6} className="flex-1">
				{children}
			</Box>
		</Stack>
	)
}
