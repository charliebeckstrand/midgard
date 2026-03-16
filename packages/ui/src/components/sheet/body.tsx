'use client'

import clsx from 'clsx'
import type React from 'react'

export function SheetBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} className={clsx('flex-1 overflow-auto px-6 py-6', className)} />
}
