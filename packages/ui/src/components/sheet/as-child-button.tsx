'use client'

import type React from 'react'
import { cloneElement, isValidElement, type ReactElement } from 'react'

export type AsChildButtonProps = {
	asChild?: boolean
	children: React.ReactElement | React.ReactNode
} & Omit<React.ComponentPropsWithoutRef<'button'>, 'children'>

export function AsChildButton({ asChild, children, onClick, ...props }: AsChildButtonProps) {
	if (asChild && isValidElement(children)) {
		return cloneElement(children as ReactElement<Record<string, unknown>>, {
			onClick: (e: React.MouseEvent) => {
				const childOnClick = (children as ReactElement<Record<string, unknown>>).props.onClick as
					| ((e: React.MouseEvent) => void)
					| undefined
				childOnClick?.(e)
				onClick?.(e as React.MouseEvent<HTMLButtonElement>)
			},
		})
	}

	return (
		<button type="button" onClick={onClick} {...props}>
			{children}
		</button>
	)
}
