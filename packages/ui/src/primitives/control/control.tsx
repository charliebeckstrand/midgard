import type { ComponentPropsWithoutRef } from 'react'
import { cn } from '../../core'
import { k } from '../../recipes/kata/control'

export type ControlFrameProps = ComponentPropsWithoutRef<'span'>

/** Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs. */
export function ControlFrame({ className, ...props }: ControlFrameProps) {
	return <span data-slot="control-frame" className={cn(k.frame, className)} {...props} />
}
