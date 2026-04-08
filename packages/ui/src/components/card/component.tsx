import { cn } from '../../core'
import { katachi } from '../../recipes'
import { type CardVariants, cardVariants } from './variants'

const k = katachi.card

export type CardProps = CardVariants & {
	className?: string
	children?: React.ReactNode
}

export function Card({ variant, className, children }: CardProps) {
	return (
		<div data-slot="card" className={cn(cardVariants({ variant }), className)}>
			{children}
		</div>
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
