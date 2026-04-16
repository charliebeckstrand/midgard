'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { Children, isValidElement, type ReactNode, useCallback, useState } from 'react'
import { cn } from '../../core'
import { Button } from '../button'
import { Icon } from '../icon'
import { AlertProvider } from './context'
import { type AlertVariants, alertVariants, k } from './variants'

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
	block?: boolean
	closable?: boolean
	/** Initial open state — uncontrolled. @default true */
	defaultOpen?: boolean
	/** Controlled open state. */
	open?: boolean
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void
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
	block,
	closable,
	defaultOpen = true,
	open: openProp,
	onOpenChange,
	className,
	children,
}: AlertProps) {
	const [uncontrolled, setUncontrolled] = useState(defaultOpen)

	const isControlled = openProp !== undefined

	const open = isControlled ? openProp : uncontrolled

	const close = useCallback(() => {
		if (!isControlled) setUncontrolled(false)

		onOpenChange?.(false)
	}, [isControlled, onOpenChange])

	if (!open) return null

	const resolvedVariant = variant ?? 'soft'

	const resolvedColor = type ? typeColorMap[type] : (color ?? 'zinc')

	const resolvedIcon = icon ?? (type ? typeIconMap[type] : undefined)

	const role = type ? typeRoleMap[type] : undefined

	const hasTitle = title || hasChild(children, AlertTitle)

	const hasDescription = description || hasChild(children, AlertDescription)

	const center = !(hasTitle && hasDescription)

	return (
		<AlertProvider value={{ variant: resolvedVariant, color: resolvedColor }}>
			<div
				data-slot="alert"
				role={role}
				className={cn(
					alertVariants({ variant, color: resolvedColor }),
					center ? 'items-center' : 'items-start',
					block && 'w-full',
					type && !closable && 'pr-6',
					className,
				)}
			>
				{resolvedIcon && (
					<Icon icon={resolvedIcon} className={cn('shrink-0', !center && 'mt-0.5')} />
				)}

				<div className={cn(k.content)}>
					{title && <div className={cn(k.title)}>{title}</div>}

					{description && <div className={cn(k.description)}>{description}</div>}

					{children}

					{actions && <div className={cn(k.actions)}>{actions}</div>}
				</div>

				{closable && (
					<Button
						variant="plain"
						aria-label="Dismiss"
						className={cn(k.close, 'self-center')}
						onClick={close}
					>
						<Icon icon={<X />} />
					</Button>
				)}
			</div>
		</AlertProvider>
	)
}

export type AlertTitleProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function AlertTitle({ className, children, ...props }: AlertTitleProps) {
	return (
		<div className={cn(k.title, className)} {...props}>
			{children}
		</div>
	)
}

export type AlertDescriptionProps = {
	className?: string
} & Omit<React.ComponentPropsWithoutRef<'div'>, 'className'>

export function AlertDescription({ className, children, ...props }: AlertDescriptionProps) {
	return (
		<div className={cn(k.description, className)} {...props}>
			{children}
		</div>
	)
}
