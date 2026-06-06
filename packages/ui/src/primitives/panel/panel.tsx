'use client'

import { type ComponentPropsWithoutRef, useEffect } from 'react'
import { cn, createContext } from '../../core'
import { k } from '../../recipes/kata/panel'

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
