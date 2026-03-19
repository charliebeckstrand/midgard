'use client'

import type React from 'react'
import { cn } from '../../core'
import { PopoverPanel } from '../../primitives'
import { narabi } from '../../recipes'
import { SelectedOptionProvider } from './context'

export function ListboxOptions({ children }: { children: React.ReactNode }) {
	return (
		<PopoverPanel className={cn(narabi.anchor.bottom, 'scroll-py-1', 'overflow-y-scroll')}>
			<SelectedOptionProvider value={{ isSelectedOption: false }}>
				{children}
			</SelectedOptionProvider>
		</PopoverPanel>
	)
}
