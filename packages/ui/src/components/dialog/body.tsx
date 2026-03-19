'use client'

import type React from 'react'
import { cn } from '../../core'
import { sumi } from '../../recipes'

export function DialogBody({ className, ...props }: React.ComponentPropsWithoutRef<'div'>) {
	return <div data-slot="body" {...props} className={cn(`mt-6 ${sumi.base}`, className)} />
}
