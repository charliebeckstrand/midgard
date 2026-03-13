import { cva } from 'class-variance-authority'

export const linkVariants = cva([
	'rounded',
	'text-blue-500',
	'hover:underline',
	'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black',
])
