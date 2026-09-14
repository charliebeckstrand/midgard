import type { ComponentProps } from 'react'
import { createSlot } from '../../core'
import { k } from '../../recipes/kata/alert'

/** Props for {@link AlertTitle}: standard `<div>` slot props. */
export type AlertTitleProps = ComponentProps<'div'>

/** Heading slot for {@link Alert}, rendered above the description. */
export const AlertTitle = createSlot('div', 'alert-title', k.title)
