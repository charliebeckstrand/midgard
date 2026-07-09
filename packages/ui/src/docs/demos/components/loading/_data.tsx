export const sizes = ['xs', 'sm', 'md', 'lg', 'xl'] as const

export const buttonSizes = ['xs', 'sm', 'md', 'lg'] as const

export type ButtonSize = (typeof buttonSizes)[number]

export const colors = ['zinc', 'red', 'amber', 'green', 'blue'] as const
