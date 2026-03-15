import type React from 'react'
import type { VariantProps } from 'class-variance-authority'
import type { button } from './variants'
import type { Link } from '../link'

export type ButtonProps = VariantProps<typeof button> & {
	className?: string
	children: React.ReactNode
} & (
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)
