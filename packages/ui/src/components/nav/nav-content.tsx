import type { ComponentProps } from 'react'
import { CurrentContent, CurrentContents } from '../../primitives/current'

/** Props for {@link NavContents}: the underlying current-content wrapper props with `slotPrefix` fixed to `"nav"`. */
export type NavContentsProps = Omit<ComponentProps<typeof CurrentContents>, 'slotPrefix'>
/** Props for {@link NavContent}: the underlying current-content props with `slotPrefix` fixed to `"nav"`. */
export type NavContentProps = Omit<ComponentProps<typeof CurrentContent>, 'slotPrefix'>

/** Container that swaps in the panel matching the {@link Nav}'s active `value`; collects the {@link NavContent} children. */
export function NavContents(props: NavContentsProps) {
	return <CurrentContents slotPrefix="nav" {...props} />
}

/** A single keyed panel shown when its key matches the {@link Nav}'s active `value`. */
export function NavContent(props: NavContentProps) {
	return <CurrentContent slotPrefix="nav" {...props} />
}
