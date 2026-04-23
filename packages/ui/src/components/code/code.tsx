import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { type CodeVariants, codeVariants } from './variants'

export type CodeProps = ComponentPropsWithoutRef<'code'> & {
	size?: CodeVariants['size']
}

export function Code({ className, size, ...props }: CodeProps) {
	return <code data-slot="code" className={cn(codeVariants({ size }), className)} {...props} />
}
