import type { ComponentProps } from 'react'
import { createSlot } from '../../core'

/** Props for {@link FiltersPrefix}: standard `<div>` slot props. */
export type FiltersPrefixProps = ComponentProps<'div'>

/** Content above the control line of a {@link Filters} bar. */
export const FiltersPrefix = createSlot('div', 'filters-prefix')

/** Props for {@link FiltersSuffix}: standard `<div>` slot props. */
export type FiltersSuffixProps = ComponentProps<'div'>

/** Content below the control line of a {@link Filters} bar. */
export const FiltersSuffix = createSlot('div', 'filters-suffix')
