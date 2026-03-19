import { cn, Link } from '../../core'
import { sumi } from '../../recipes'

export type TextProps = React.ComponentPropsWithoutRef<'p'>

export function Text({ className, ...props }: TextProps) {
	return <p data-slot="text" {...props} className={cn(`text-base/6 ${sumi.usui}`, className)} />
}

export type TextLinkProps = React.ComponentPropsWithoutRef<typeof Link>

export function TextLink({ className, ...props }: TextLinkProps) {
	return (
		<Link
			{...props}
			className={cn(
				`${sumi.base} underline decoration-zinc-950/50`,
				'hover:decoration-zinc-950',
				'dark:decoration-white/50',
				'dark:hover:decoration-white',
				className,
			)}
		/>
	)
}

export type StrongProps = React.ComponentPropsWithoutRef<'strong'>

export function Strong({ className, ...props }: StrongProps) {
	return <strong {...props} className={cn(`font-medium ${sumi.base}`, className)} />
}

export type CodeProps = React.ComponentPropsWithoutRef<'code'>

export function Code({ className, ...props }: CodeProps) {
	return (
		<code
			{...props}
			className={cn(
				`rounded-sm border border-zinc-950/10 bg-zinc-950/2.5 px-0.5 text-sm font-medium ${sumi.base} sm:text-[0.8125rem]`,
				'dark:border-white/20 dark:bg-white/5',
				className,
			)}
		/>
	)
}
