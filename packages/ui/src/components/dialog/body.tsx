'use client'

import clsx from 'clsx'
import type React from 'react'

export function DialogBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div {...props} className={clsx(className, 'mt-6 dark:text-white')} />
}
