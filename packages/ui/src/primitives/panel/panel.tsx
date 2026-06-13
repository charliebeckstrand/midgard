'use client'

import { type ComponentPropsWithoutRef, type ReactNode, useEffect } from 'react'
import { cn, createContext } from '../../core'
import { headingWeight, titleSize } from '../../recipes/kata/heading'
import { k } from '../../recipes/kata/panel'
import { useDensity } from '../density'
import { PanelCloseContext, usePanelCloseValue } from './panel-close-context'

const DEFAULT_TITLE = k.title
const DEFAULT_DESCRIPTION = k.description
const DEFAULT_HEADER = k.header
const DEFAULT_BODY = k.body
const DEFAULT_FOOTER = k.footer
const DEFAULT_CONTENT = k.content

/** Props for a panel `Title` slot (`<h2>`). */
export type PanelTitleProps = ComponentPropsWithoutRef<'h2'>
/** Props for a panel `Description` slot (`<p>`). */
export type PanelDescriptionProps = ComponentPropsWithoutRef<'p'>
/** Props for a panel `Header` slot (`<div>`). */
export type PanelHeaderProps = ComponentPropsWithoutRef<'div'>
/** Props for a panel `Body` slot (`<div>`); scroll region. */
export type PanelBodyProps = ComponentPropsWithoutRef<'div'>
/** Props for a panel `Footer` slot (`<div>`). */
export type PanelFooterProps = ComponentPropsWithoutRef<'div'>
/** Props for a panel `Content` slot (`<div>`). */
export type PanelContentProps = ComponentPropsWithoutRef<'div'>

type PanelA11yContextValue = {
	titleId?: string
	descriptionId?: string
	registerTitle?: (renderedId?: string) => () => void
	registerDescription?: (renderedId?: string) => () => void
}

/**
 * Broadcasts the panel's accessible-name ids and registration callbacks from
 * `useA11yPanel` to the Title / Description slots, which adopt the ids and
 * register their presence.
 */
export const [PanelA11yContext, usePanelA11y] = createContext<PanelA11yContextValue>('PanelA11y', {
	default: {},
})

/** Props for {@link PanelProviders}: the panel root's `onOpenChange` and a11y descriptor wired into the slot contexts. */
export type PanelProvidersProps = {
	/** The panel root's `onOpenChange`; powers the Close context. */
	onOpenChange: (open: boolean) => void
	/** A11y ids/registration from `useA11yPanel`, broadcast to the slot children. */
	a11y: PanelA11yContextValue
	children: ReactNode
}

/**
 * Wraps a panel surface's children in the shared context envelope: the Close
 * context (`PanelClose` and slot dismiss resolve it) nested over the A11y
 * context (Title / Description register and adopt their ids).
 */
export function PanelProviders({ onOpenChange, a11y, children }: PanelProvidersProps) {
	const closeValue = usePanelCloseValue(onOpenChange)

	return (
		<PanelCloseContext value={closeValue}>
			<PanelA11yContext value={a11y}>{children}</PanelA11yContext>
		</PanelCloseContext>
	)
}

/** Optional per-slot class overrides for `createPanel`; each defaults to the panel recipe. */
type PanelSlots = {
	title?: string | string[]
	description?: string | string[]
	header?: string | string[]
	body?: string | string[]
	footer?: string | string[]
	content?: string | string[]
}

/**
 * Builds the Title, Description, Header, Body, Footer, and Content slot
 * components for a panel surface, each stamping `data-slot="<slotPrefix>-*"`.
 * Title and Description adopt the ambient `PanelA11yContext` ids; Body is the
 * scroll region. Pass `slots` to override individual slot classes.
 */
export function createPanel(slotPrefix: string, slots?: PanelSlots) {
	const titleClass = slots?.title ?? DEFAULT_TITLE
	const descriptionClass = slots?.description ?? DEFAULT_DESCRIPTION
	const headerClass = slots?.header ?? DEFAULT_HEADER
	const bodyClass = slots?.body ?? DEFAULT_BODY
	const footerClass = slots?.footer ?? DEFAULT_FOOTER
	const contentClass = slots?.content ?? DEFAULT_CONTENT

	function Title({ className, id, ...props }: PanelTitleProps) {
		const { titleId, registerTitle } = usePanelA11y()
		const { size } = useDensity()

		useEffect(() => registerTitle?.(id), [registerTitle, id])

		return (
			<h2
				id={id ?? titleId}
				data-slot={`${slotPrefix}-title`}
				// Level-2 weight and density-scaled size come from the heading scale.
				className={cn(titleClass, headingWeight(2), titleSize(size), className)}
				{...props}
			/>
		)
	}

	function Description({ className, id, ...props }: PanelDescriptionProps) {
		const { descriptionId, registerDescription } = usePanelA11y()

		useEffect(() => registerDescription?.(id), [registerDescription, id])

		return (
			<p
				id={id ?? descriptionId}
				data-slot={`${slotPrefix}-description`}
				className={cn(descriptionClass, className)}
				{...props}
			/>
		)
	}

	function Header({ className, ...props }: PanelHeaderProps) {
		return (
			<div data-slot={`${slotPrefix}-header`} className={cn(headerClass, className)} {...props} />
		)
	}

	function Body({ className, ...props }: PanelBodyProps) {
		return (
			<div
				data-slot={`${slotPrefix}-body`}
				data-scroll-region
				className={cn(bodyClass, className)}
				{...props}
			/>
		)
	}

	function Footer({ className, ...props }: PanelFooterProps) {
		return (
			<div data-slot={`${slotPrefix}-footer`} className={cn(footerClass, className)} {...props} />
		)
	}

	function Content({ className, ...props }: PanelContentProps) {
		return (
			<div data-slot={`${slotPrefix}-content`} className={cn(contentClass, className)} {...props} />
		)
	}

	return { Title, Description, Header, Body, Footer, Content }
}
