import type { ComponentPropsWithoutRef } from 'react'
import { CurrentContent, CurrentContents } from '../../primitives/current'

export type TabContentsProps = Omit<ComponentPropsWithoutRef<typeof CurrentContents>, 'slotPrefix'>
export type TabContentProps = Omit<ComponentPropsWithoutRef<typeof CurrentContent>, 'slotPrefix'>

export function TabContents(props: TabContentsProps) {
	return <CurrentContents slotPrefix="tab" {...props} />
}

export function TabContent(props: TabContentProps) {
	return <CurrentContent slotPrefix="tab" {...props} />
}
