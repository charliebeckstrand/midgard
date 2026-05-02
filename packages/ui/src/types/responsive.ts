export const BREAKPOINTS = ['initial', 'sm', 'md', 'lg', 'xl', '2xl'] as const

export type Breakpoint = (typeof BREAKPOINTS)[number]

export type Responsive<T> = T | { initial?: T; sm?: T; md?: T; lg?: T; xl?: T; '2xl'?: T }
