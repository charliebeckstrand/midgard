import { cn } from '../../core'
import {
	type StatDeltaVariants,
	type StatValueVariants,
	k,
	statDeltaVariants,
	statValueVariants,
} from './variants'

export type StatProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function Stat({ className, children, ...props }: StatProps) {
	return (
		<div data-slot="stat" className={cn(k.base, className)} {...props}>
			{children}
		</div>
	)
}

export type StatLabelProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatLabel({ className, children, ...props }: StatLabelProps) {
	return (
		<div data-slot="stat-label" className={cn(k.label, className)} {...props}>
			{children}
		</div>
	)
}

export type StatValueProps = StatValueVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatValue({ size, className, children, ...props }: StatValueProps) {
	return (
		<div data-slot="stat-value" className={cn(statValueVariants({ size }), className)} {...props}>
			{children}
		</div>
	)
}

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDelta({ trend, className, children, ...props }: StatDeltaProps) {
	return (
		<div data-slot="stat-delta" className={cn(statDeltaVariants({ trend }), className)} {...props}>
			{children}
		</div>
	)
}

export type StatDescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function StatDescription({ className, children, ...props }: StatDescriptionProps) {
	return (
		<div data-slot="stat-description" className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
