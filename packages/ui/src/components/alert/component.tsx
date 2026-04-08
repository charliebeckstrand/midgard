'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { Children, isValidElement, type ReactNode } from 'react'
import { cn } from '../../core'
import { katachi } from '../../recipes'
import { Button } from '../button'
import { Icon } from '../icon'
import { type AlertVariants, alertVariants } from './variants'

type AlertType = 'info' | 'success' | 'warning' | 'error'

type AlertColor = NonNullable<AlertVariants['color']>

const typeColorMap: Record<AlertType, AlertColor> = {
	info: 'blue',
	success: 'green',
	warning: 'amber',
	error: 'red',
}

const typeIconMap: Record<AlertType, React.ReactElement> = {
	info: <Info />,
	success: <CheckCircle />,
	warning: <AlertTriangle />,
	error: <XCircle />,
}

const typeRoleMap: Record<AlertType, 'alert' | 'status'> = {
	info: 'status',
	success: 'status',
	warning: 'alert',
	error: 'alert',
}

const k = katachi.alert

function hasChild(children: ReactNode, component: (...args: never[]) => ReactNode): boolean {
	return Children.toArray(children).some(
		(child) => isValidElement(child) && child.type === component,
	)
}

export type AlertProps = Omit<AlertVariants, 'color'> & {
	type?: AlertType
	color?: AlertColor
	icon?: React.ReactElement
	title?: React.ReactNode
	description?: React.ReactNode
	actions?: React.ReactNode
	closable?: boolean
	onClose?: () => void
	className?: string
	children?: React.ReactNode
}

export function Alert({
	type,
	variant,
	color,
	icon,
	title,
	description,
	actions,
	closable,
	onClose,
	className,
	children,
}: AlertProps) {
	const resolvedColor = type ? typeColorMap[type] : color

	const resolvedIcon = icon ?? (type ? typeIconMap[type] : undefined)

	const role = type ? typeRoleMap[type] : undefined

	const hasTitle = title || hasChild(children, AlertTitle)

	const hasDescription = description || hasChild(children, AlertDescription)

	const center = !(hasTitle && hasDescription)

	return (
		<div
			data-slot="alert"
			role={role}
			className={cn(
				alertVariants({ variant, color: resolvedColor }),
				center && 'items-center',
				className,
			)}
		>
			{resolvedIcon && <Icon icon={resolvedIcon} className={cn('shrink-0')} />}

			<div className={cn(k.content)}>
				{title && <div className={cn(k.title)}>{title}</div>}

				{description && <div className={cn(k.description)}>{description}</div>}

				{children}

				{actions && <div className={cn(k.actions)}>{actions}</div>}
			</div>

			{closable && (
				<Button
					variant="plain"
					color="inherit"
					aria-label="Dismiss"
					className={cn(k.close, 'self-center')}
					onClick={onClose}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</div>
	)
}

export type AlertTitleProps = {
	className?: string
	children: React.ReactNode
}

export function AlertTitle({ className, children }: AlertTitleProps) {
	return <div className={cn(k.title, className)}>{children}</div>
}

export type AlertDescriptionProps = {
	className?: string
	children: React.ReactNode
}

export function AlertDescription({ className, children }: AlertDescriptionProps) {
	return <div className={cn(k.description, className)}>{children}</div>
}
