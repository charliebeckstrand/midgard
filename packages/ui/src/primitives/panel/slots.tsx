'use client'

import { useEffect } from 'react'
import { cn } from '../../core'
import { headingWeight, titleRamp } from '../../recipes/kata/heading'
import { k } from '../../recipes/kata/panel'
import { usePanelA11y } from './panel-providers'
import type {
	PanelBodyProps,
	PanelContentProps,
	PanelDescriptionProps,
	PanelFooterProps,
	PanelHeaderProps,
	PanelTitleProps,
} from './types'

/**
 * Optional per-slot class overrides for `createPanel`; each defaults to the panel recipe.
 *
 * @internal
 */
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
 *
 * @returns The `{ Title, Description, Header, Body, Footer, Content }` slot
 * family bound to `slotPrefix`.
 * @see {@link PanelProviders}
 */
export function createPanel(slotPrefix: string, slots?: PanelSlots) {
	const {
		title: titleClass = k.title,
		description: descriptionClass = k.description,
		header: headerClass = k.header,
		body: bodyClass = k.body,
		footer: footerClass = k.footer,
		content: contentClass = k.content,
	} = slots ?? {}

	function Title({ className, id, ...props }: PanelTitleProps) {
		const { titleId, registerTitle } = usePanelA11y()
		useEffect(() => registerTitle?.(id), [registerTitle, id])

		return (
			<h2
				id={id ?? titleId}
				data-slot={`${slotPrefix}-title`}
				// The weight of level 2 and the title size come from the heading scale. The
				// size follows the nearest density scope.
				className={cn(titleClass, headingWeight(2), titleRamp, className)}
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
