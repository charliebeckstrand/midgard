/**
 * Shared size density for form-control components (input, listbox, combobox,
 * datepicker) — border-compensated padding + font size per density step.
 * Not part of the Kata public barrel.
 */

import { ji } from '../ji'

export const controlSize = {
	sm: ['px-[calc(--spacing(2.5)-1px)] py-[calc(--spacing(1.5)-1px)]', ji.size.sm],
	md: ['px-[calc(--spacing(3)-1px)] py-[calc(--spacing(2)-1px)]', ji.size.md],
	lg: ['px-[calc(--spacing(3.5)-1px)] py-[calc(--spacing(2.5)-1px)]', ji.size.lg],
}

/** Icon-slot layout inside control (chevron, affix). */
export const controlIcon = ['flex items-center', 'pr-2', 'pointer-events-none']
