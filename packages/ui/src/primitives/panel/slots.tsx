'use client'

import { type ReactNode, useEffect } from 'react'
import { cn } from '../../core'
import { k as heading } from '../../recipes/kata/heading'
import { k } from '../../recipes/kata/panel'
import { usePanelA11y } from './context'
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
 * `DefaultFooter` is the footer that the root renders after its children. It
 * shows only while the panel has no Footer, so a Footer from the consumer
 * replaces it. A base style of `ui/tailwind.css` makes that decision, not an
 * effect (`core/panel/base.ts`). Thus the server HTML shows the correct footer
 * before hydration.
 *
 * @returns The `{ Title, Description, Header, Body, Footer, Content,
 * DefaultFooter }` slot family bound to `slotPrefix`.
 * @see {@link PanelProviders}
 */
export function createPanel(slotPrefix: string, slots?: PanelSlots) {
	const defaults = k()

	const {
		title: titleClass = defaults.title,
		description: descriptionClass = defaults.description,
		header: headerClass = defaults.header,
		body: bodyClass = defaults.body,
		footer: footerClass = defaults.footer,
		content: contentClass = defaults.content,
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
				className={cn(titleClass, heading.weight[level], heading.ramp[4], className)}
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
				data-scroll-region
				className={cn(bodyClass, className)}
				{...props}
				// After the spread: the resize floor of a sheet or a drawer selects the
				// body by this anchor (CONVENTIONS.md §3.9).
				data-slot={`${slotPrefix}-body`}
			/>
		)
	}

	function Footer({ className, ...props }: PanelFooterProps) {
		return (
			<div
				data-slot={`${slotPrefix}-footer`}
				className={cn(footerClass, className)}
				{...props}
				// The mark that the default footer of the root looks for. It comes after
				// the spread, so a consumer prop cannot remove it (CONVENTIONS.md §3.9).
				data-panel-footer=""
			/>
		)
	}

	/**
	 * The footer that the root shows when the panel has no Footer slot. Pass the
	 * content of the footer row. `null` or `false` shows no footer.
	 */
	function DefaultFooter({ children }: { children?: ReactNode }) {
		if (children === undefined || children === null || children === false) return null

		return (
			<div
				data-slot={`${slotPrefix}-footer`}
				data-panel-footer="default"
				className={cn(footerClass)}
			>
				{children}
			</div>
		)
	}

	function Content({ className, ...props }: PanelContentProps) {
		return (
			<div data-slot={`${slotPrefix}-content`} className={cn(contentClass, className)} {...props} />
		)
	}

	return {
		/**
		 * The title of a panel: an `h{level}` heading, `<h2>` by default, that registers
		 * as the `aria-labelledby` target of the panel. Its type scales with density.
		 */
		Title,
		/**
		 * The description of a panel: a `<p>` that registers as the
		 * `aria-describedby` target of the panel.
		 */
		Description,
		/** The header of a panel: a `<div>` that groups the title and the description. */
		Header,
		/**
		 * The body of a panel, which scrolls when its content is tall. It is a `<div>`
		 * that fills the remaining height.
		 */
		Body,
		/**
		 * The footer of a panel: a `<div>` action row at its foot. It replaces the
		 * default footer, which holds the standard Close button.
		 */
		Footer,
		/**
		 * A wrapper for panel content outside the rhythm of the header, body, and
		 * footer; renders a `<div>`.
		 */
		Content,
		DefaultFooter,
	}
}
