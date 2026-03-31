import { cn } from '../../core'
import {
	dialogActionsVariants,
	dialogBodyVariants,
	dialogDescriptionVariants,
	dialogTitleVariants,
} from './variants'

export type DialogTitleProps = React.ComponentPropsWithoutRef<'h2'>

export type DialogDescriptionProps = React.ComponentPropsWithoutRef<'p'>

export type DialogBodyProps = React.ComponentPropsWithoutRef<'div'>

export type DialogActionsProps = React.ComponentPropsWithoutRef<'div'>

export function DialogTitle({ className, ...props }: DialogTitleProps) {
	return <h2 data-slot="dialog-title" className={cn(dialogTitleVariants(), className)} {...props} />
}

export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
	return (
		<p
			data-slot="dialog-description"
			className={cn(dialogDescriptionVariants(), className)}
			{...props}
		/>
	)
}

export function DialogBody({ className, ...props }: DialogBodyProps) {
	return <div data-slot="dialog-body" className={cn(dialogBodyVariants(), className)} {...props} />
}

export function DialogActions({ className, ...props }: DialogActionsProps) {
	return (
		<div data-slot="dialog-actions" className={cn(dialogActionsVariants(), className)} {...props} />
	)
}
