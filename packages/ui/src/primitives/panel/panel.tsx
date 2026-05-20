'use client'

import { type ComponentPropsWithoutRef, useCallback, useEffect, useMemo, useState } from 'react'
import { cn, createContext } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { narabi } from '../../recipes/ryu/narabi'

const defaultTitle = narabi.panel.title
const defaultDescription = narabi.panel.description
const defaultBody = narabi.panel.body
const defaultActions = narabi.panel.actions

export type PanelTitleProps = ComponentPropsWithoutRef<'h2'>
export type PanelDescriptionProps = ComponentPropsWithoutRef<'p'>
export type PanelBodyProps = ComponentPropsWithoutRef<'div'>
export type PanelActionsProps = ComponentPropsWithoutRef<'div'>

type PanelA11yContextValue = {
	titleId?: string
	descriptionId?: string
	registerTitle?: () => () => void
	registerDescription?: () => () => void
}

export const [PanelA11yProvider, usePanelA11y] = createContext<PanelA11yContextValue>('PanelA11y', {
	default: {},
})

function useTitleRegistration() {
	const [hasTitle, setHasTitle] = useState(false)

	const registerTitle = useCallback(() => {
		setHasTitle(true)
		return () => setHasTitle(false)
	}, [])

	return { hasTitle, registerTitle }
}

function useDescriptionRegistration() {
	const [hasDescription, setHasDescription] = useState(false)

	const registerDescription = useCallback(() => {
		setHasDescription(true)
		return () => setHasDescription(false)
	}, [])

	return { hasDescription, registerDescription }
}

export type PanelA11yScopeOptions = {
	/** Used as `aria-label` only when no Title slot registers and no `ariaLabelledBy` is provided. */
	ariaLabel?: string
	/** External label reference; used as `aria-labelledby` only when no Title slot registers. */
	ariaLabelledBy?: string
}

/**
 * Sets up the a11y scaffolding required by modal panel roots (dialog, drawer, sheet):
 * generates title/description ids, tracks whether Title / Description slots are
 * rendered, and returns ready-to-spread ARIA props and a memoized provider value.
 * Precedence for the dialog's accessible name: Title slot (if registered) →
 * `ariaLabelledBy` → `ariaLabel`. `aria-labelledby` / `aria-describedby` are only
 * set once the matching slot has registered, so the dialog never references a
 * non-existent id.
 */
export function usePanelA11yScope({ ariaLabel, ariaLabelledBy }: PanelA11yScopeOptions = {}) {
	const scope = useIdScope()

	const titleId = scope.sub('title')
	const descriptionId = scope.sub('description')

	const { hasTitle, registerTitle } = useTitleRegistration()
	const { hasDescription, registerDescription } = useDescriptionRegistration()

	const panelAriaProps = {
		role: 'dialog' as const,
		'aria-modal': true,
		'aria-label': hasTitle || ariaLabelledBy ? undefined : ariaLabel,
		'aria-labelledby': hasTitle ? titleId : ariaLabelledBy,
		'aria-describedby': hasDescription ? descriptionId : undefined,
	}

	const providerValue = useMemo<PanelA11yContextValue>(
		() => ({ titleId, descriptionId, registerTitle, registerDescription }),
		[titleId, descriptionId, registerTitle, registerDescription],
	)

	return { panelAriaProps, providerValue }
}

/** Creates Title, Description, Body, and Actions slot components for a panel prefix. */
type PanelSlots = {
	title?: string | string[]
	description?: string | string[]
	body?: string | string[]
	actions?: string | string[]
}

export function createPanel(prefix: string, slots?: PanelSlots) {
	const titleCls = slots?.title ?? defaultTitle
	const descriptionCls = slots?.description ?? defaultDescription
	const bodyCls = slots?.body ?? defaultBody
	const actionsCls = slots?.actions ?? defaultActions

	function Title({ className, id, ...props }: PanelTitleProps) {
		const { titleId, registerTitle } = usePanelA11y()

		useEffect(() => registerTitle?.(), [registerTitle])

		return (
			<h2
				id={id ?? titleId}
				data-slot={`${prefix}-title`}
				className={cn(titleCls, className)}
				{...props}
			/>
		)
	}

	function Description({ className, id, ...props }: PanelDescriptionProps) {
		const { descriptionId, registerDescription } = usePanelA11y()

		useEffect(() => registerDescription?.(), [registerDescription])

		return (
			<p
				id={id ?? descriptionId}
				data-slot={`${prefix}-description`}
				className={cn(descriptionCls, className)}
				{...props}
			/>
		)
	}

	function Body({ className, ...props }: PanelBodyProps) {
		return <div data-slot={`${prefix}-body`} className={cn(bodyCls, className)} {...props} />
	}

	function Actions({ className, ...props }: PanelActionsProps) {
		return <div data-slot={`${prefix}-actions`} className={cn(actionsCls, className)} {...props} />
	}

	return { Title, Description, Body, Actions }
}
