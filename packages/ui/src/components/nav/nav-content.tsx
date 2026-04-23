import type { ComponentPropsWithoutRef } from 'react'
import { createCurrentContent } from '../../primitives'

// ── NavContents / NavContent ────────────────────────────

const { Contents: NavContents, Content: NavContent } = createCurrentContent('nav')

export { NavContent, NavContents }

export type NavContentsProps = ComponentPropsWithoutRef<typeof NavContents>
export type NavContentProps = ComponentPropsWithoutRef<typeof NavContent>
