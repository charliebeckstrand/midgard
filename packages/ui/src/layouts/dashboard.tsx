'use client'

import { SlidersHorizontal } from 'lucide-react'
import type React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { Box } from '../components/box'
import { Button } from '../components/button'
import { Drawer, DrawerBody, DrawerTitle } from '../components/drawer'
import { Icon } from '../components/icon'
import { Stack } from '../components/stack'
import { cn } from '../core'
import { omote } from '../recipes/omote'

export type DashboardLayoutProps = React.PropsWithChildren<{
	header?: React.ReactNode
	filters?: React.ReactNode
}>

export function DashboardLayout({ header, filters, children }: DashboardLayoutProps) {
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
		<Stack gap={4} className={cn('w-full', omote.surface)}>
			{header}

			{filters && (
				<>
					{/* Filters on desktop */}
					<Box className="shrink-0 max-lg:hidden">{filters}</Box>

					{/* Filter trigger on mobile */}
					<Box className="shrink-0 lg:hidden">
						<Button variant="outline" onClick={() => setOpen(true)}>
							<Icon icon={<SlidersHorizontal />} />
							Filters
						</Button>
					</Box>

					{/* Filter drawer on mobile */}
					<Drawer open={open} onClose={close}>
						<DrawerTitle>Filters</DrawerTitle>
						<DrawerBody>
							<Stack gap={4}>{filters}</Stack>
						</DrawerBody>
					</Drawer>
				</>
			)}

			<Box className="flex-1">{children}</Box>
		</Stack>
	)
}
