import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Box, type BoxProps } from '../box'

const k = katachi.card

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
	children?: React.ReactNode
}

export function CardHeader({ className, children }: CardHeaderProps) {
	return (
		<div data-slot="card-header" className={cn(k.header, className)}>
			{children}
		</div>
	)
}

export type CardTitleProps = {
	className?: string
	children?: React.ReactNode
}

export function CardTitle({ className, children }: CardTitleProps) {
	return (
		<div data-slot="card-title" className={cn(k.title, className)}>
			{children}
		</div>
	)
}

export type CardDescriptionProps = {
	className?: string
	children?: React.ReactNode
}

export function CardDescription({ className, children }: CardDescriptionProps) {
	return (
		<p data-slot="card-description" className={cn(k.description, className)}>
			{children}
		</p>
	)
}

export type CardBodyProps = {
	className?: string
	children?: React.ReactNode
}

export function CardBody({ className, children }: CardBodyProps) {
	return (
		<div data-slot="card-body" className={cn(k.body, className)}>
			{children}
		</div>
	)
}

export type CardFooterProps = {
	className?: string
	children?: React.ReactNode
}

export function CardFooter({ className, children }: CardFooterProps) {
	return (
		<div data-slot="card-footer" className={cn(k.footer, className)}>
			{children}
		</div>
	)
}
