import type { ComponentPropsWithoutRef } from 'react'
import { CurrentContent, CurrentContents } from '../../primitives/current'

export type NavContentsProps = Omit<ComponentPropsWithoutRef<typeof CurrentContents>, 'slotPrefix'>
export type NavContentProps = Omit<ComponentPropsWithoutRef<typeof CurrentContent>, 'slotPrefix'>

export function NavContents(props: NavContentsProps) {
	return <CurrentContents slotPrefix="nav" {...props} />
}

export function NavContent(props: NavContentProps) {
	return <CurrentContent slotPrefix="nav" {...props} />
}
