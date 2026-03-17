import { cn } from '../../core'

export type HeadingProps = { level?: 1 | 2 | 3 | 4 | 5 | 6 } & React.ComponentPropsWithoutRef<
	'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
>

const headingSizes: Record<number, string> = {
	1: 'text-3xl/9 font-bold sm:text-2xl/8',
	2: 'text-2xl/8 font-semibold sm:text-xl/8',
	3: 'text-xl/8 font-semibold sm:text-lg/7',
	4: 'text-lg/7 font-semibold sm:text-base/7',
	5: 'text-base/7 font-semibold',
	6: 'text-sm/6 font-semibold',
}

export function Heading({ className, level = 1, ...props }: HeadingProps) {
	const Element: `h${typeof level}` = `h${level}`

	return (
		<Element
			data-slot="heading"
			{...props}
			className={cn(headingSizes[level], 'text-zinc-950', 'dark:text-white', className)}
		/>
	)
}

export function Subheading({ className, level = 2, ...props }: HeadingProps) {
	const Element: `h${typeof level}` = `h${level}`

	return (
		<Element
			data-slot="heading"
			{...props}
			className={cn('text-base/7 font-semibold text-zinc-950', 'dark:text-white', className)}
		/>
	)
}
