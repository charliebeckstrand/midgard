import { createCurrentContent } from '../../primitives'

// ── NavContents / NavContent ────────────────────────────

const { Contents: NavContents, Content: NavContent } = createCurrentContent('nav')

export { NavContent, NavContents }

export type NavContentsProps = React.ComponentPropsWithoutRef<typeof NavContents>
export type NavContentProps = React.ComponentPropsWithoutRef<typeof NavContent>
