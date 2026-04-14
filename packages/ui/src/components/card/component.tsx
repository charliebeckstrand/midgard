import { cn } from '../../core'
import { Box, type BoxProps } from '../box'
import { k } from './variants'

export type CardProps = BoxProps

export function Card({
	p,
	px,
	py,
	radius = 'lg',
	bg = 'tint',
	border = true,
	className,
	...props
}: CardProps) {
	const noExplicitPadding = p === undefined && px === undefined && py === undefined
	return (
		<Box
			dataSlot="card"
			p={p}
			px={px}
			py={py}
			radius={radius}
			bg={bg}
			border={border}
			className={cn(
				'overflow-hidden',
				noExplicitPadding && '[&:not(:has(>[data-slot^=card-]))]:p-5',
				className,
			)}
			{...props}
		/>
	)
}

export type CardHeaderProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CardHeader({ className, children, ...props }: CardHeaderProps) {
	return (
		<div data-slot="card-header" className={cn(k.header, className)} {...props}>
			{children}
		</div>
	)
}

export type CardTitleProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CardTitle({ className, children, ...props }: CardTitleProps) {
	return (
		<div data-slot="card-title" className={cn(k.title, className)} {...props}>
			{children}
		</div>
	)
}

export type CardDescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'p'>, 'className'>

export function CardDescription({ className, children, ...props }: CardDescriptionProps) {
	return (
		<p data-slot="card-description" className={cn(k.description, className)} {...props}>
			{children}
		</p>
	)
}

export type CardBodyProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CardBody({ className, children, ...props }: CardBodyProps) {
	return (
		<div data-slot="card-body" className={cn(k.body, className)} {...props}>
			{children}
		</div>
	)
}

export type CardFooterProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function CardFooter({ className, children, ...props }: CardFooterProps) {
	return (
		<div data-slot="card-footer" className={cn(k.footer, className)} {...props}>
			{children}
		</div>
	)
}
