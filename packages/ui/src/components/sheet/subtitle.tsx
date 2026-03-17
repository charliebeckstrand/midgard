'use client'

import clsx from 'clsx'
import type React from 'react'

export function SheetSubtitle({ className, ...props }: React.ComponentPropsWithoutRef<'p'>) {
	return <p {...props} className={clsx(className, 'text-sm/6 text-zinc-500 dark:text-zinc-400')} />
}
