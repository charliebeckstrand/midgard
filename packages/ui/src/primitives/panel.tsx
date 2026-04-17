import { cva } from 'class-variance-authority'
import {
	createContext as reactCreateContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useState,
} from 'react'
import { cn } from '../core'
import { useIdScope } from '../hooks/use-id-scope'
import { katachi } from '../recipes'

const k = katachi.panel

export const panelTitleVariants = cva(k.title)

export const panelDescriptionVariants = cva(k.description)

export const panelBodyVariants = cva(k.body)

export const panelActionsVariants = cva(k.actions)

export type PanelTitleProps = React.ComponentPropsWithoutRef<'h2'>
export type PanelDescriptionProps = React.ComponentPropsWithoutRef<'p'>
export type PanelBodyProps = React.ComponentPropsWithoutRef<'div'>
export type PanelActionsProps = React.ComponentPropsWithoutRef<'div'>

type PanelA11yContextValue = {
	titleId?: string
	descriptionId?: string
	registerDescription?: () => () => void
}

const PanelA11yContext = reactCreateContext<PanelA11yContextValue>({})

export const PanelA11yProvider = PanelA11yContext.Provider

export function usePanelA11y() {
	return useContext(PanelA11yContext)
}

/** Hook for panel components to track whether a Description slot has been rendered. */
export function useDescriptionRegistration() {
	const [hasDescription, setHasDescription] = useState(false)

	const registerDescription = useCallback(() => {
		setHasDescription(true)
		return () => setHasDescription(false)
	}, [])

	return { hasDescription, registerDescription }
}

/**
 * Sets up the a11y scaffolding required by modal panel roots (dialog, drawer, sheet):
 * generates title/description ids, tracks whether a Description slot is rendered,
 * and returns ready-to-spread ARIA props and a memoized provider value.
 */
export function usePanelA11yScope() {
	const scope = useIdScope()

	const titleId = scope.sub('title')
	const descriptionId = scope.sub('description')

	const { hasDescription, registerDescription } = useDescriptionRegistration()

	const panelAriaProps = {
		role: 'dialog' as const,
		'aria-modal': true,
		'aria-labelledby': titleId,
		'aria-describedby': hasDescription ? descriptionId : undefined,
	}

	const providerValue = useMemo<PanelA11yContextValue>(
		() => ({ titleId, descriptionId, registerDescription }),
		[titleId, descriptionId, registerDescription],
	)

	return { panelAriaProps, providerValue }
}

/** Creates Title, Description, Body, and Actions slot components for a panel prefix. */
type PanelSlotVariants = {
	title?: () => string
	description?: () => string
	body?: () => string
	actions?: () => string
}

export function createPanel(prefix: string, variants?: PanelSlotVariants) {
	const titleCva = variants?.title ?? panelTitleVariants
	const descriptionCva = variants?.description ?? panelDescriptionVariants
	const bodyCva = variants?.body ?? panelBodyVariants
	const actionsCva = variants?.actions ?? panelActionsVariants

	function Title({ className, id, ...props }: PanelTitleProps) {
		const { titleId } = usePanelA11y()
		return (
			<h2
				id={id ?? titleId}
				data-slot={`${prefix}-title`}
				className={cn(titleCva(), className)}
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
				className={cn(descriptionCva(), className)}
				{...props}
			/>
		)
	}

	function Body({ className, ...props }: PanelBodyProps) {
		return <div data-slot={`${prefix}-body`} className={cn(bodyCva(), className)} {...props} />
	}

	function Actions({ className, ...props }: PanelActionsProps) {
		return (
			<div data-slot={`${prefix}-actions`} className={cn(actionsCva(), className)} {...props} />
		)
	}

	return { Title, Description, Body, Actions }
}
