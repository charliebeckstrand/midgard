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

export type PanelTitleProps = ComponentPropsWithoutRef<'h2'>
export type PanelDescriptionProps = ComponentPropsWithoutRef<'p'>
export type PanelHeaderProps = ComponentPropsWithoutRef<'div'>
export type PanelBodyProps = ComponentPropsWithoutRef<'div'>
export type PanelFooterProps = ComponentPropsWithoutRef<'div'>
export type PanelContentProps = ComponentPropsWithoutRef<'div'>

type PanelA11yContextValue = {
	titleId?: string
	descriptionId?: string
	registerTitle?: () => () => void
	registerDescription?: () => () => void
}

export const [PanelA11yContext, usePanelA11y] = createContext<PanelA11yContextValue>('PanelA11y', {
	default: {},
})

export type PanelProvidersProps = {
	/** The panel root's `onOpenChange`; powers the Close context. */
	onOpenChange: (open: boolean) => void
	/** A11y ids/registration from `useA11yPanel`, broadcast to the slot children. */
	a11y: PanelA11yContextValue
	children: ReactNode
}

/**
 * Wraps a panel surface's children in the context envelope every overlay
 * (Dialog / Drawer / Sheet) shares: the Close context (so `PanelClose` and
 * slot dismiss resolve) over the A11y context (so Title / Description register
 * and adopt their ids). Owning the nesting here keeps the three roots in
 * lockstep — the close-outside-a11y order can't drift between them.
 */
export function PanelProviders({ onOpenChange, a11y, children }: PanelProvidersProps) {
	const closeValue = usePanelCloseValue(onOpenChange)

	return (
		<PanelCloseContext value={closeValue}>
			<PanelA11yContext value={a11y}>{children}</PanelA11yContext>
		</PanelCloseContext>
	)
}

/** Creates Title, Description, Header, Body, Footer, and Content slot components for a panel prefix. */
type PanelSlots = {
	title?: string | string[]
	description?: string | string[]
	header?: string | string[]
	body?: string | string[]
	footer?: string | string[]
	content?: string | string[]
}

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

		useEffect(() => registerTitle?.(), [registerTitle])

		return (
			<h2
				id={id ?? titleId}
				data-slot={`${slotPrefix}-title`}
				// An `<h2>`: weight (level 2) and the density-scaled size both come
				// from the heading scale, so panel titles stay single-sourced with
				// `<Heading>` without the primitive importing the component.
				className={cn(titleClass, headingWeight(2), titleSize(size), className)}
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
