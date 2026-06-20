import { createSlot } from '../../core'
import type { SlotProps } from '../../core/create-slot'
import { k } from '../../recipes/kata/breadcrumb'

/** Props for {@link BreadcrumbList}; the underlying `<ol>` attributes. */
export type BreadcrumbListProps = SlotProps<'ol'>

/**
 * Ordered list (`<ol>`) holding the crumbs and separators of a `<Breadcrumb>`.
 * Static leaf: renders in React Server Components.
 */
export const BreadcrumbList = createSlot('ol', 'breadcrumb-list', k.list())
