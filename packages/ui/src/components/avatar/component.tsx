import { cn, Link } from '../../core'
import { TouchTarget } from '../../primitives'
import { type AvatarVariants, avatarVariants } from './variants'

export type AvatarProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'span'>, 'className'>

export function Avatar({ src, alt = '', initials, size, className, ...props }: AvatarProps) {
	return (
		<span data-slot="avatar" className={cn(avatarVariants({ size }), className)} {...props}>
			{initials && (
				<svg
					className="select-none fill-current text-[48px] font-medium uppercase"
					viewBox="0 0 100 100"
					aria-hidden={alt ? undefined : 'true'}
					role="img"
					aria-label={alt || undefined}
				>
					<text
						x="50%"
						y="50%"
						alignmentBaseline="middle"
						dominantBaseline="middle"
						textAnchor="middle"
						dy=".125em"
					>
						{initials}
					</text>
				</svg>
			)}
			{src && <img className="size-full object-cover" src={src} alt={alt} />}
		</span>
	)
}

type AvatarButtonBaseProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	className?: string
}

export type AvatarButtonProps = AvatarButtonBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function AvatarButton({ src, alt, initials, size, className, ...props }: AvatarButtonProps) {
	const classes = cn(
		'relative cursor-default rounded-full focus:outline-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600',
		className,
	)

	const avatar = <Avatar src={src} alt={alt} initials={initials} size={size} />

	if ('href' in props && props.href !== undefined) {
		const { href, ...linkProps } = props
		return (
			<Link data-slot="avatar-button" href={href} className={classes} {...linkProps}>
				<TouchTarget>{avatar}</TouchTarget>
			</Link>
		)
	}

	return (
		<button
			data-slot="avatar-button"
			type="button"
			className={classes}
			{...(props as Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)}
		>
			<TouchTarget>{avatar}</TouchTarget>
		</button>
	)
}
