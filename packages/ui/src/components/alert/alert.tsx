'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { Children, isValidElement, type ReactElement, type ReactNode, useCallback } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { type AlertVariants, alertVariants, k } from '../../recipes/kata/alert'
import { Button } from '../button'
import { Icon } from '../icon'
import { AlertDescription } from './alert-description'
import { AlertTitle } from './alert-title'

export type AlertSeverity = 'info' | 'success' | 'warning' | 'error'

type AlertColor = NonNullable<AlertVariants['color']>

const severityColorMap: Record<AlertSeverity, AlertColor> = {
	info: 'blue',
	success: 'green',
	warning: 'amber',
	error: 'red',
}

const severityIconMap: Record<AlertSeverity, ReactElement> = {
	info: <Info />,
	success: <CheckCircle />,
	warning: <AlertTriangle />,
	error: <XCircle />,
}

const severityRoleMap: Record<AlertSeverity, 'alert' | 'status'> = {
	info: 'status',
	success: 'status',
	warning: 'alert',
	error: 'alert',
}

function hasChild(children: ReactNode, component: (...args: never[]) => ReactNode): boolean {
	return Children.toArray(children).some(
		(child) => isValidElement(child) && child.type === component,
	)
}

export type AlertProps = AlertVariants & {
	/**
	 * Semantic kind: drives the default color, an icon, and the ARIA role
	 * (`'alert'` for warning/error, `'status'` for info/success). Use `color`
	 * to render a colored alert with no semantic meaning.
	 */
	severity?: AlertSeverity
	icon?: ReactElement
	title?: ReactNode
	description?: ReactNode
	actions?: ReactNode
	block?: boolean
	closable?: boolean
	/** Initial open state — uncontrolled. @default true */
	defaultOpen?: boolean
	/** Controlled open state. */
	open?: boolean
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void
	className?: string
	children?: ReactNode
}

export function Alert({
	severity,
	variant,
	color,
	icon,
	title,
	description,
	actions,
	block,
	closable,
	defaultOpen = true,
	open: openProp,
	onOpenChange,
	className,
	children,
}: AlertProps) {
	const [open = true, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen,
		onChange: onOpenChange ? (next) => onOpenChange(next ?? false) : undefined,
	})

	const close = useCallback(() => setOpen(false), [setOpen])

	if (!open) return null

	const resolvedVariant = variant ?? 'soft'

	const resolvedColor = severity ? severityColorMap[severity] : (color ?? 'zinc')

	const resolvedIcon = icon ?? (severity ? severityIconMap[severity] : undefined)

	const role = severity ? severityRoleMap[severity] : undefined

	const hasTitle = title || hasChild(children, AlertTitle)

	const hasDescription = description || hasChild(children, AlertDescription)

	const center = !(hasTitle && hasDescription)

	return (
		<div
			data-slot="alert"
			role={role}
			className={cn(
				alertVariants({ variant, color: resolvedColor }),
				center ? 'items-center' : 'items-start',
				block && 'w-full',
				severity && !closable && 'pr-6',
				className,
			)}
		>
			{resolvedIcon && <Icon icon={resolvedIcon} className={cn('shrink-0', !center && 'mt-0.5')} />}

			<div className={cn(k.content)}>
				{title && <div className={cn(k.title)}>{title}</div>}

				{description && <div className={cn(k.description)}>{description}</div>}

				{children}

				{actions && <div className={cn(k.actions)}>{actions}</div>}
			</div>

			{closable && (
				<Button
					variant="plain"
					color={resolvedVariant === 'solid' ? 'inherit' : resolvedColor}
					aria-label="Dismiss"
					className={cn(k.close, 'self-center')}
					onClick={close}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</div>
	)
}
