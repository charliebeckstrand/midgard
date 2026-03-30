'use client'

import { cn, Link } from '../../core'
import { TouchTarget } from '../../primitives'
import { ki } from '../../recipes'
import { avatarInitialsVariants, avatarVariants, type AvatarVariants } from './variants'

export type AvatarProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	className?: string
}

export function Avatar({ src, alt = '', initials, size, className }: AvatarProps) {
	return (
		<span data-slot="avatar" className={cn(avatarVariants({ size }), className)}>
			{src ? (
				<img data-slot="avatar-image" src={src} alt={alt} className="size-full object-cover" />
			) : (
				<span data-slot="avatar-initials" className={avatarInitialsVariants({ size })}>
					{initials}
				</span>
			)}
		</span>
	)
}

type AvatarButtonBaseProps = AvatarProps

export type AvatarButtonProps = AvatarButtonBaseProps &
	(
		| ({ href?: never } & Omit<React.ComponentPropsWithoutRef<'button'>, 'className'>)
		| ({ href: string } & Omit<React.ComponentPropsWithoutRef<typeof Link>, 'className'>)
	)

export function AvatarButton({
	src,
	alt,
	initials,
	size,
	className,
	...props
}: AvatarButtonProps) {
	const classes = cn(ki.reset, ki.offset, 'relative rounded-full', className)

	if ('href' in props && props.href !== undefined) {
		const { href, ...rest } = props

		return (
			<Link href={href} data-slot="avatar-button" className={classes} {...rest}>
				<TouchTarget>
					<Avatar src={src} alt={alt} initials={initials} size={size} />
				</TouchTarget>
			</Link>
		)
	}

	const { type = 'button', ...rest } = props as Omit<
		React.ComponentPropsWithoutRef<'button'>,
		'className'
	>

	return (
		<button data-slot="avatar-button" type={type} className={classes} {...rest}>
			<TouchTarget>
				<Avatar src={src} alt={alt} initials={initials} size={size} />
			</TouchTarget>
		</button>
	)
}
