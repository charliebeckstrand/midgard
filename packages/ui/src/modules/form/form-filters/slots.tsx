import type { ComponentProps } from 'react'
import { createSlot } from '../../../core'

/** Props for {@link FormFiltersPrefix}: standard `<div>` slot props. */
export type FormFiltersPrefixProps = ComponentProps<'div'>

/** Content above the control line of a {@link FormFilters} bar. */
export const FormFiltersPrefix = createSlot('div', 'form-filters-prefix')

/** Props for {@link FormFiltersSuffix}: standard `<div>` slot props. */
export type FormFiltersSuffixProps = ComponentProps<'div'>

/** Content below the control line of a {@link FormFilters} bar. */
export const FormFiltersSuffix = createSlot('div', 'form-filters-suffix')
