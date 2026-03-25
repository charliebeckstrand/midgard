import type { VariantProps } from 'class-variance-authority'
import type React from 'react'
import type { Link } from '../../core/link-context'
import type { button } from './variants'

export type ButtonProps = VariantProps<typeof button> & {
	className?: string
	children: React.ReactNode
	ref?: React.Ref<HTMLButtonElement | HTMLAnchorElement>
} & (
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)
