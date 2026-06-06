'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react'
import { cn } from '../../core'
import { useControllable } from '../../hooks'
import { type AlertVariants, k } from '../../recipes/kata/alert'
import { Button } from '../button'
import { Icon } from '../icon'
import { AlertBody } from './alert-body'

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

const SLOT_DISPLAY_NAMES = new Set(['alert-title', 'alert-description', 'alert-body'])

function isSlotChild(node: ReactNode): boolean {
	if (!isValidElement(node)) return false

	const type = node.type as { displayName?: string } | string

	return typeof type !== 'string' && SLOT_DISPLAY_NAMES.has(type.displayName ?? '')
}

function renderChildren(children: ReactNode): ReactNode {
	if (children === undefined || children === null || children === false) return null

	const hasSlot = Children.toArray(children).some(isSlotChild)

	return hasSlot ? children : <AlertBody>{children}</AlertBody>
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
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
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
	'data-slot': slot = 'alert',
}: AlertProps) {
	const [open = true, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange ? (next) => onOpenChange(next ?? false) : undefined,
	})

	if (!open) return null

	const resolvedVariant = variant ?? 'soft'

	const resolvedColor = severity ? severityColorMap[severity] : (color ?? 'zinc')

	const resolvedIcon = icon ?? (severity ? severityIconMap[severity] : undefined)

	const role = severity ? severityRoleMap[severity] : undefined

	return (
		<div
			data-slot={slot}
			role={role}
			className={cn(
				k({ variant, color: resolvedColor }),
				block && 'w-full',
				severity && !closable && 'pr-6',
				className,
			)}
		>
			<div
				className={cn(
					k.content,
					resolvedIcon ? 'grid grid-cols-[auto_minmax(0,1fr)] gap-x-2' : 'flex flex-col',
				)}
			>
				{resolvedIcon && <Icon icon={resolvedIcon} className={cn(k.icon)} />}

				{title && <div className={cn(k.title, resolvedIcon && 'self-center')}>{title}</div>}

				{description && <div className={cn(k.description)}>{description}</div>}

				{renderChildren(children)}

				{actions && <div className={cn(k.actions, resolvedIcon && 'col-start-2')}>{actions}</div>}
			</div>

			{closable && (
				<Button
					variant="plain"
					color={resolvedVariant === 'solid' ? 'inherit' : resolvedColor}
					aria-label="Dismiss"
					className={cn(k.close, 'self-center')}
					onClick={() => setOpen(false)}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</div>
	)
}
