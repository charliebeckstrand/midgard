'use client'

import { AsChildButton, type AsChildButtonProps } from './as-child-button'
import { useSheet } from './context'

export function SheetClose(props: AsChildButtonProps) {
	const { onOpenChange } = useSheet()
	return <AsChildButton {...props} onClick={() => onOpenChange(false)} />
}
