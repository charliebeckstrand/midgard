'use client'

import clsx from 'clsx'
import type React from 'react'
import { PopoverPanel } from '../../primitives'
import { SelectedOptionProvider } from './context'

export function ListboxOptions({ children }: { children: React.ReactNode }) {
	return (
		<PopoverPanel className={clsx('left-0 top-full mt-1', 'scroll-py-1', 'overflow-y-scroll')}>
			<SelectedOptionProvider value={{ isSelectedOption: false }}>
				{children}
			</SelectedOptionProvider>
		</PopoverPanel>
	)
}
