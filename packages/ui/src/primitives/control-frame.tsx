import { cn } from '../core'
import { waku } from '../recipes/waku'

export type ControlFrameProps = React.ComponentPropsWithoutRef<'span'>

/** Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs. */
export function ControlFrame({ className, ...props }: ControlFrameProps) {
	return <span data-slot="control-frame" className={cn(waku.control.base, className)} {...props} />
}
