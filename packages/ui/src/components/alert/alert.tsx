'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import {
	Children,
	isValidElement,
	type ReactElement,
	type ReactNode,
	type RefObject,
	useEffect,
	useRef,
	useState,
} from 'react'
import { announce, cn } from '../../core'
import { useControllable } from '../../hooks'
import { type AlertVariants, k } from '../../recipes/kata/alert'
import { Button } from '../button'
import { Icon } from '../icon'
import { AlertBody } from './alert-body'

/** Semantic kind of an alert; selects its default color, icon, and ARIA live role. */
export type AlertSeverity = 'info' | 'success' | 'warning' | 'error'

type AlertColor = NonNullable<AlertVariants['color']>

const severityColorMap = {
	info: 'blue',
	success: 'green',
	warning: 'amber',
	error: 'red',
} satisfies Record<AlertSeverity, AlertColor>

const severityIconMap = {
	info: <Info />,
	success: <CheckCircle />,
	warning: <AlertTriangle />,
	error: <XCircle />,
} satisfies Record<AlertSeverity, ReactElement>

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

/** Props for {@link Alert}; merges recipe variants with severity, content slots, and controlled/uncontrolled open state. */
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
	/** Stretch to fill the available inline width rather than shrink to content. */
	block?: boolean
	closable?: boolean
	/** Initial open state (uncontrolled). @defaultValue true */
	defaultOpen?: boolean
	/** Controlled open state. */
	open?: boolean
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void
	/**
	 * When the alert is dismissed via its close button, move focus to this
	 * element instead of letting it fall to the document body (WCAG 2.4.3).
	 * Opt-in; focus is untouched when unset. Point it at the control that
	 * surfaced the alert.
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
	className?: string
	children?: ReactNode
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
}

function resolveAlertPresentation(
	severity: AlertSeverity | undefined,
	politeSeverity: boolean,
	color: AlertColor | undefined,
	icon: ReactElement | undefined,
): {
	resolvedColor: AlertColor
	resolvedIcon: ReactElement | undefined
	role: 'status' | 'alert' | undefined
} {
	const resolvedColor = severity ? severityColorMap[severity] : (color ?? 'zinc')

	const resolvedIcon = icon ?? (severity ? severityIconMap[severity] : undefined)

	const role = severity ? (politeSeverity ? 'status' : 'alert') : undefined

	return { resolvedColor, resolvedIcon, role }
}

function AlertContent({
	resolvedIcon,
	title,
	description,
	actions,
	children,
}: {
	resolvedIcon: ReactElement | undefined
	title: ReactNode
	description: ReactNode
	actions: ReactNode
	children: ReactNode
}) {
	return (
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
	)
}

/**
 * Dismissible message bar with severity-driven color, icon, and ARIA role;
 * accepts `title`/`description`/`actions` props or slotted children
 * ({@link AlertTitle}/{@link AlertDescription}/{@link AlertBody}), and runs
 * controlled or uncontrolled via `open`/`defaultOpen`. A `closable` close
 * button can return focus to `returnFocusTo` on dismiss.
 *
 * @remarks
 * Client component. Polite severities (`info`/`success`, `role="status"`) are
 * re-announced through the persistent announcer on appear, since screen
 * readers can miss a live region inserted together with its text (WCAG 4.1.3);
 * `warning`/`error` use `role="alert"` and announce on insertion.
 */
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
	returnFocusTo,
	className,
	children,
	'data-slot': slot = 'alert',
}: AlertProps) {
	const [open = true, setOpen] = useControllable<boolean>({
		value: openProp,
		defaultValue: defaultOpen,
		onValueChange: onOpenChange ? (next) => onOpenChange(next ?? false) : undefined,
	})

	// When `open` is controlled but `onOpenChange` is absent, `setOpen(false)`
	// is a no-op; local state tracks dismissal instead.
	const controlledWithoutHandler = openProp !== undefined && onOpenChange === undefined

	const [locallyDismissed, setLocallyDismissed] = useState(false)

	// Any change to the controlled prop supersedes a local dismissal.
	const [prevOpenProp, setPrevOpenProp] = useState(openProp)

	if (openProp !== prevOpenProp) {
		setPrevOpenProp(openProp)

		setLocallyDismissed(false)
	}

	const alertRef = useRef<HTMLDivElement>(null)

	const wasOpen = useRef(open)

	// Screen readers can miss `role="status"` (info/success) when the live
	// region and its text are inserted together. On closed→open, mirrors
	// rendered text through the persistent announcer (WCAG 4.1.3).
	// `role="alert"` (warning/error) announces on insertion.
	const politeSeverity = severity === 'info' || severity === 'success'

	useEffect(() => {
		const appeared = open && !wasOpen.current

		wasOpen.current = open

		if (!appeared || !politeSeverity) return

		const message = alertRef.current?.textContent?.trim()

		if (message) announce(message)
	}, [open, politeSeverity])

	if (!open || (controlledWithoutHandler && locallyDismissed)) return null

	const { resolvedColor, resolvedIcon, role } = resolveAlertPresentation(
		severity,
		politeSeverity,
		color,
		icon,
	)

	return (
		<div
			ref={alertRef}
			data-slot={slot}
			role={role}
			className={cn(
				k({ variant, color: resolvedColor }),
				block && 'w-full',
				severity && !closable && 'pr-6',
				className,
			)}
		>
			<AlertContent
				resolvedIcon={resolvedIcon}
				title={title}
				description={description}
				actions={actions}
			>
				{children}
			</AlertContent>

			{closable && (
				<Button
					variant="plain"
					color={variant === 'solid' ? 'inherit' : resolvedColor}
					aria-label="Dismiss"
					className={cn(k.close, 'self-center')}
					onClick={() => {
						setOpen(false)

						if (controlledWithoutHandler) setLocallyDismissed(true)

						// Moves focus to the caller's element rather than <body> (WCAG 2.4.3).
						returnFocusTo?.current?.focus()
					}}
				>
					<Icon icon={<X />} />
				</Button>
			)}
		</div>
	)
}
