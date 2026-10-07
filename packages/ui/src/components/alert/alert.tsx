'use client'

import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react'
import { type ReactElement, type ReactNode, type RefObject, useEffect, useRef } from 'react'
import { announce, cn } from '../../core'
import { useControllableFlag } from '../../hooks'
import { type AlertVariants, k } from '../../recipes/kata/alert'
import { Button } from '../button'
import { type ButtonDefaults, ButtonDefaultsProvider } from '../button/context'
import type { HeadingLevel } from '../heading'
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

/** Whether `children` holds body content. `undefined`, `null`, and `false` are empty. @internal */
function hasBody(children: ReactNode): boolean {
	return children != null && children !== false
}

/** Wraps loose children in {@link AlertBody}; renders nothing for an empty child. @internal */
function renderChildren(children: ReactNode): ReactNode {
	return hasBody(children) ? <AlertBody>{children}</AlertBody> : null
}

/** Props for {@link Alert}; merges recipe variants with severity, content slots, and controlled/uncontrolled open state. */
export type AlertProps = Omit<AlertVariants, 'color'> & {
	/**
	 * The palette color of the alert. It replaces the color of the `severity`.
	 *
	 * @defaultValue The color of the `severity`: blue, green, amber, or red. With no `severity`, the color is zinc.
	 */
	color?: AlertVariants['color']
	/**
	 * Semantic kind: drives the default color, an icon, and the ARIA role
	 * (`'alert'` for warning/error, `'status'` for info/success). The icon shows
	 * only when the alert has a `title`. An explicit `color` replaces the color
	 * of the severity. Use `color` alone to render a colored alert with no
	 * semantic meaning.
	 */
	severity?: AlertSeverity
	/** Icon at the start. It replaces the icon of `severity`, and shows with or without a `title`. */
	icon?: ReactElement
	/** The heading of the alert, in the larger, semibold text. A severity icon shows only with a title. */
	title?: ReactNode
	/**
	 * Heading level of the `title`. Set it when the alert heads a part of the page,
	 * so that a screen reader can find the title in the heading list. Omit it to
	 * render the title in a `<div>`. The look does not change with the level.
	 */
	titleLevel?: HeadingLevel
	/** The text under the title, in a tight line height. */
	description?: ReactNode
	/**
	 * Controls under the text. A button in them with no `variant` or `color`
	 * takes the soft variant in the color of the alert, and a solid alert gives
	 * it the plain variant in the text color. A solid or a soft button in a solid
	 * alert takes the color of the recipe, as the text color paints no fill. The
	 * defaults stop at a portal, such as a dialog that an action opens.
	 */
	actions?: ReactNode
	/**
	 * Shows a close button that dismisses the alert.
	 * @defaultValue false
	 */
	closable?: boolean
	/** Initial open state (uncontrolled). @defaultValue true */
	defaultOpen?: boolean
	/**
	 * Controlled open state. A controlled alert stays open until `open` changes,
	 * so pass `onOpenChange` with it to let the close button dismiss the alert.
	 */
	open?: boolean
	/** Called when the open state changes. */
	onOpenChange?: (open: boolean) => void
	/**
	 * Whether an `info` or `success` alert that mounts open is mirrored through
	 * the announcer, as one that opens later is.
	 *
	 * @remarks
	 * Set it on an alert that a user action renders, such as
	 * `{saved && <Alert severity="success" announceOnMount />}`. Without it, an
	 * alert that mounts open stays silent, because it can be part of the page
	 * as it loads. A `warning` or `error` alert announces on insertion, so the
	 * prop has no effect there.
	 *
	 * @defaultValue false
	 */
	announceOnMount?: boolean
	/**
	 * When the alert is dismissed via its close button, move focus to this
	 * element instead of letting it fall to the document body (WCAG 2.4.3).
	 * Opt-in; focus is untouched when unset. Point it at the control that
	 * surfaced the alert.
	 */
	returnFocusTo?: RefObject<HTMLElement | null>
	className?: string
	/** The body of the alert, under the description. The alert wraps it in an `AlertBody`. */
	children?: ReactNode
	/** Root slot identifier. Wrappers override it to stamp their own name. */
	'data-slot'?: string
}

/**
 * Resolves the color, the icon, and the ARIA role from the severity. An explicit
 * `color` or `icon` wins over the default of the severity. The icon of a severity
 * needs a title: beside body text alone, it looks too heavy.
 *
 * @internal
 */
function resolveAlertPresentation(
	severity: AlertSeverity | undefined,
	politeSeverity: boolean,
	color: AlertColor | undefined,
	icon: ReactElement | undefined,
	hasTitle: boolean,
): {
	resolvedColor: AlertColor
	resolvedIcon: ReactElement | undefined
	role: 'status' | 'alert' | undefined
} {
	const resolvedColor = color ?? (severity ? severityColorMap[severity] : 'zinc')

	const resolvedIcon = icon ?? (severity && hasTitle ? severityIconMap[severity] : undefined)

	const role = severity ? (politeSeverity ? 'status' : 'alert') : undefined

	return { resolvedColor, resolvedIcon, role }
}

/** Inner grid that lays out the resolved icon, title, description, body, and actions. @internal */
function AlertContent({
	resolvedIcon,
	title,
	titleLevel,
	description,
	actions,
	actionDefaults,
	children,
}: {
	resolvedIcon: ReactElement | undefined
	title: ReactNode
	titleLevel: HeadingLevel | undefined
	description: ReactNode
	actions: ReactNode
	actionDefaults: ButtonDefaults
	children: ReactNode
}) {
	// Tailwind preflight resets the font and the margin of a heading, so a heading
	// title looks the same as a `<div>` title.
	const Title = titleLevel === undefined ? 'div' : (`h${titleLevel}` as const)

	return (
		<div className={cn(k.content, resolvedIcon ? k.columns : 'flex flex-col')}>
			{resolvedIcon && <Icon icon={resolvedIcon} className={cn(k.icon)} />}

			{title && <Title className={cn(k.title, resolvedIcon && 'self-center')}>{title}</Title>}

			{description && <div className={cn(k.description)}>{description}</div>}

			{renderChildren(children)}

			{actions && (
				<div className={cn(k.actions, resolvedIcon && 'col-start-2')}>
					<ButtonDefaultsProvider value={actionDefaults}>{actions}</ButtonDefaultsProvider>
				</div>
			)}
		</div>
	)
}

/**
 * Dismissible message bar with severity-driven color, icon, and ARIA role. It
 * takes its content through `title`, `description`, `actions`, and `children`,
 * and runs controlled or uncontrolled via `open`/`defaultOpen`. A `closable`
 * close button can return focus to `returnFocusTo` on dismiss.
 *
 * @remarks
 * The content is props here, and not the compound children §3.6 prefers
 * elsewhere, which is a deliberate reversal. Toast renders an Alert from a
 * queue entry — data, with no children to compose — so the prop form is the
 * one both paths can use. There used to be a slot trio beside it, reconciled
 * by sniffing each child's `displayName`. That is the cost the second channel
 * carried, and it is gone with the slots.
 *
 * The padding, the text, the title, and the icon take the step of the nearest
 * density scope. At `md` the alert is `p-4` with a `text-lg` title.
 *
 * Client component. Polite severities (`info`/`success`, `role="status"`) are
 * re-announced through the persistent announcer when they open after the mount.
 * With `announceOnMount`, the announcer also takes an alert that mounts open.
 * Screen readers can miss a live region inserted together with its text (WCAG
 * 4.1.3). `warning`/`error` use `role="alert"` and announce on insertion.
 */
export function Alert({
	severity,
	variant,
	color,
	icon,
	title,
	titleLevel,
	description,
	actions,
	closable,
	defaultOpen = true,
	open: openProp,
	onOpenChange,
	announceOnMount = false,
	returnFocusTo,
	className,
	children,
	'data-slot': slot = 'alert',
}: AlertProps) {
	const [open, setOpen] = useControllableFlag({
		value: openProp,
		defaultValue: defaultOpen ?? true,
		onValueChange: onOpenChange,
	})

	const alertRef = useRef<HTMLDivElement>(null)

	// An alert that mounts open counts as one that opened, when the caller asks for it.
	const wasOpen = useRef(open && !announceOnMount)

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

	if (!open) return null

	const { resolvedColor, resolvedIcon, role } = resolveAlertPresentation(
		severity,
		politeSeverity,
		color,
		icon,
		Boolean(title),
	)

	// A title over more rows holds the close button on the title row. A lone
	// row centers it, so the button keeps the height of the alert.
	const multiRow = Boolean(title && (description || actions || hasBody(children)))

	return (
		<div
			ref={alertRef}
			data-slot={slot}
			role={role}
			className={cn(k({ variant, color: resolvedColor }), className)}
		>
			<AlertContent
				resolvedIcon={resolvedIcon}
				title={title}
				titleLevel={titleLevel}
				description={description}
				actions={actions}
				actionDefaults={
					variant === 'solid'
						? { variant: 'plain', color: 'inherit' }
						: { variant: 'soft', color: resolvedColor }
				}
			>
				{children}
			</AlertContent>

			{closable && (
				<div className={cn(k.close.base, multiRow ? k.close.line : 'self-center')}>
					<Button
						type="button"
						variant="plain"
						color={variant === 'solid' ? 'inherit' : resolvedColor}
						aria-label="Dismiss"
						onClick={() => {
							setOpen(false)

							// Moves focus to the caller's element rather than <body> (WCAG 2.4.3).
							returnFocusTo?.current?.focus()
						}}
					>
						<Icon icon={<X />} />
					</Button>
				</div>
			)}
		</div>
	)
}
