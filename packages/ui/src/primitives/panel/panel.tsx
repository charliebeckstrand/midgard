'use client'

import { type ComponentPropsWithoutRef, useCallback, useEffect, useMemo, useState } from 'react'
import { cn, createContext } from '../../core'
import { useIdScope } from '../../hooks/use-id-scope'
import { k } from '../../recipes/kata/panel'

const DEFAULT_TITLE = k.title
const DEFAULT_DESCRIPTION = k.description
const DEFAULT_BODY = k.body
const DEFAULT_ACTIONS = k.actions

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

function useSlotRegistration() {
	const [present, setPresent] = useState(false)

	const register = useCallback(() => {
		setPresent(true)
		return () => setPresent(false)
	}, [])

	return [present, register] as const
}

/**
 * Sets up the a11y scaffolding required by modal panel roots (dialog, drawer, sheet):
 * generates title/description ids, tracks whether Title / Description slots are
 * rendered, and returns ready-to-spread ARIA props and a memoized provider value.
 * `aria-labelledby` / `aria-describedby` are only set once the matching slot has
 * registered, so the dialog never references a non-existent id.
 */
export function usePanelA11yScope() {
	const scope = useIdScope()

	const titleId = scope.sub('title')
	const descriptionId = scope.sub('description')

	const [hasTitle, registerTitle] = useSlotRegistration()
	const [hasDescription, registerDescription] = useSlotRegistration()

	const panelAriaProps = {
		role: 'dialog' as const,
		'aria-modal': true,
		'aria-labelledby': hasTitle ? titleId : undefined,
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

export function createPanel(slotPrefix: string, slots?: PanelSlots) {
	const titleClass = slots?.title ?? DEFAULT_TITLE
	const descriptionClass = slots?.description ?? DEFAULT_DESCRIPTION
	const bodyClass = slots?.body ?? DEFAULT_BODY
	const actionsClass = slots?.actions ?? DEFAULT_ACTIONS

	function Title({ className, id, ...props }: PanelTitleProps) {
		const { titleId, registerTitle } = usePanelA11y()

		useEffect(() => registerTitle?.(), [registerTitle])

		return (
			<h2
				id={id ?? titleId}
				data-slot={`${slotPrefix}-title`}
				className={cn(titleClass, className)}
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
				data-slot={`${slotPrefix}-description`}
				className={cn(descriptionClass, className)}
				{...props}
			/>
		)
	}

	function Body({ className, ...props }: PanelBodyProps) {
		return <div data-slot={`${slotPrefix}-body`} className={cn(bodyClass, className)} {...props} />
	}

	function Actions({ className, ...props }: PanelActionsProps) {
		return (
			<div data-slot={`${slotPrefix}-actions`} className={cn(actionsClass, className)} {...props} />
		)
	}

	return { Title, Description, Body, Actions }
}
