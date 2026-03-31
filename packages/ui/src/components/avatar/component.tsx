import { cn } from '../../core'
import { Polymorphic, type PolymorphicProps, TouchTarget } from '../../primitives'
import {
	type AvatarVariants,
	avatarButtonVariants,
	avatarImageVariants,
	avatarInitialsVariants,
	avatarVariants,
} from './variants'

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
					className={avatarInitialsVariants()}
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
			{src && <img className={avatarImageVariants()} src={src} alt={alt} />}
		</span>
	)
}

type AvatarButtonBaseProps = AvatarVariants & {
	src?: string | null
	alt?: string
	initials?: string
	className?: string
}

export type AvatarButtonProps = AvatarButtonBaseProps & PolymorphicProps<'button'>

export function AvatarButton({ src, alt, initials, size, className, ...props }: AvatarButtonProps) {
	return (
		<Polymorphic
			as="button"
			dataSlot="avatar-button"
			href={props.href}
			className={cn(avatarButtonVariants(), className)}
			{...props}
		>
			<TouchTarget>
				<Avatar src={src} alt={alt} initials={initials} size={size} />
			</TouchTarget>
		</Polymorphic>
	)
}
