'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
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

	return (
		<div
			data-slot="alert"
			role={role}
			className={cn(alertVariants({ variant, color: resolvedColor }), className)}
		>
			{resolvedIcon && <Icon icon={resolvedIcon} className={cn(k.icon)} />}

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
					className={cn(k.close)}
					onClick={onClose}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</div>
	)
}
