import { cn } from '../../core'
import { katachi } from '../../recipes'
import {
	type StatDeltaVariants,
	type StatValueVariants,
	statDeltaVariants,
	statValueVariants,
} from './variants'

const k = katachi.stat

export type StatProps = {
	className?: string
	children?: React.ReactNode
}

export function Stat({ className, children }: StatProps) {
	return (
		<div data-slot="stat" className={cn(k.base, className)}>
			{children}
		</div>
	)
}

export type StatLabelProps = {
	className?: string
	children?: React.ReactNode
}

export function StatLabel({ className, children }: StatLabelProps) {
	return (
		<div data-slot="stat-label" className={cn(k.label, className)}>
			{children}
		</div>
	)
}

export type StatValueProps = StatValueVariants & {
	className?: string
	children?: React.ReactNode
}

export function StatValue({ size, className, children }: StatValueProps) {
	return (
		<div data-slot="stat-value" className={cn(statValueVariants({ size }), className)}>
			{children}
		</div>
	)
}

export type StatDeltaProps = StatDeltaVariants & {
	className?: string
	children?: React.ReactNode
}

export function StatDelta({ trend, className, children }: StatDeltaProps) {
	return (
		<div data-slot="stat-delta" className={cn(statDeltaVariants({ trend }), className)}>
			{children}
		</div>
	)
}

export type StatDescriptionProps = {
	className?: string
	children?: React.ReactNode
}

export function StatDescription({ className, children }: StatDescriptionProps) {
	return (
		<div data-slot="stat-description" className={cn(k.description, className)}>
			{children}
		</div>
	)
}
