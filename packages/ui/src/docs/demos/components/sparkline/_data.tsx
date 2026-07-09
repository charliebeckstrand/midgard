import type { Color } from '../../../../core/recipe'

export const colors: Color[] = ['zinc', 'red', 'amber', 'green', 'blue'] as const

export const sizes = ['sm', 'md', 'lg'] as const

// A rising then cresting series so line, area, and bar variants all read clearly.
export const series = [4, 6, 5, 9, 8, 12, 11, 15, 14, 19, 22, 20]
