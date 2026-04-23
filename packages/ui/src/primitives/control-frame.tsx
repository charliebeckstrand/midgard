import { cn } from '../core'
import { control } from '../recipes/kata/_control'

export type ControlFrameProps = React.ComponentPropsWithoutRef<'span'>

/** Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs. */
export function ControlFrame({ className, ...props }: ControlFrameProps) {
	return <span data-slot="control-frame" className={cn(control.frame, className)} {...props} />
}
