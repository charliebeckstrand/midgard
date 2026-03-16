'use client'

import clsx from 'clsx'
import type React from 'react'

export function SheetHeader({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} className={clsx('flex flex-col gap-1.5 px-6 pt-6', className)} />
}
