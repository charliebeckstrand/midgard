import { cva } from 'class-variance-authority'
import { cn } from '../core'
import { sumi } from '../recipes'

export const panelTitleVariants = cva([sumi.base, 'text-lg/7 font-semibold'])

export const panelDescriptionVariants = cva([sumi.usui, 'text-base/6'])

export const panelBodyVariants = cva('mt-4')

export const panelActionsVariants = cva('mt-6 flex items-center justify-end gap-3')

export type PanelTitleProps = React.ComponentPropsWithoutRef<'h2'>

export type PanelDescriptionProps = React.ComponentPropsWithoutRef<'p'>

export type PanelBodyProps = React.ComponentPropsWithoutRef<'div'>

export type PanelActionsProps = React.ComponentPropsWithoutRef<'div'>

export function PanelTitle({
	slot = 'title',
	className,
	...props
}: PanelTitleProps & { slot?: string }) {
	return <h2 data-slot={slot} className={cn(panelTitleVariants(), className)} {...props} />
}

export function PanelDescription({
	slot = 'description',
	className,
	...props
}: PanelDescriptionProps & { slot?: string }) {
	return <p data-slot={slot} className={cn(panelDescriptionVariants(), className)} {...props} />
}

export function PanelBody({
	slot = 'body',
	className,
	...props
}: PanelBodyProps & { slot?: string }) {
	return <div data-slot={slot} className={cn(panelBodyVariants(), className)} {...props} />
}

export function PanelActions({
	slot = 'actions',
	className,
	...props
}: PanelActionsProps & { slot?: string }) {
	return <div data-slot={slot} className={cn(panelActionsVariants(), className)} {...props} />
}
