'use client'

import { type ReactNode, useEffect, useLayoutEffect } from 'react'
import { cn } from '../../core'
import { headingWeight, titleRamp } from '../../recipes/kata/heading'
import { k } from '../../recipes/kata/panel'
import { DEFAULT_FOOTER_SCOPE, PanelFooterContext, usePanelFooter } from './panel-footer-context'
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
 * A mounted Footer registers with the panel. `DefaultFooter` is the footer that
 * the root renders after its children, and it renders only while no Footer is
 * registered. So a Footer from the consumer replaces the default footer.
 *
 * @returns The `{ Title, Description, Header, Body, Footer, Content,
 * DefaultFooter }` slot family bound to `slotPrefix`.
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

	function Title({ className, id, level = 2, ...props }: PanelTitleProps) {
		const { titleId, registerTitle } = usePanelA11y()
		useEffect(() => registerTitle?.(id), [registerTitle, id])

		const Heading = `h${level}` as const

		return (
			<Heading
				id={id ?? titleId}
				data-slot={`${slotPrefix}-title`}
				// The weight of the level and the title size come from the heading scale.
				// The size follows the nearest density scope.
				className={cn(titleClass, headingWeight(level), titleRamp, className)}
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
		const { register } = usePanelFooter()

		// A layout effect, so the default footer goes before the first paint and
		// the two footers never show together.
		useLayoutEffect(() => register?.(), [register])

		return (
			<div data-slot={`${slotPrefix}-footer`} className={cn(footerClass, className)} {...props} />
		)
	}

	/**
	 * The footer that the root shows when no Footer slot is registered. Pass the
	 * content of the footer row. `null` or `false` shows no footer.
	 */
	function DefaultFooter({ children }: { children?: ReactNode }) {
		const { registered } = usePanelFooter()

		if (registered || children === undefined || children === null || children === false) {
			return null
		}

		return (
			<PanelFooterContext value={DEFAULT_FOOTER_SCOPE}>
				<Footer>{children}</Footer>
			</PanelFooterContext>
		)
	}

	function Content({ className, ...props }: PanelContentProps) {
		return (
			<div data-slot={`${slotPrefix}-content`} className={cn(contentClass, className)} {...props} />
		)
	}

	return { Title, Description, Header, Body, Footer, Content, DefaultFooter }
}
