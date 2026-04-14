import { cn } from '../core'
import { waku } from '../recipes/waku'

export type FormControlProps = React.ComponentPropsWithoutRef<'span'>

/** Outer chrome wrapper providing shared focus ring, border, and disabled state for form inputs. */
export function FormControl({ className, ...props }: FormControlProps) {
	return <span data-slot="control" className={cn(waku.control, className)} {...props} />
}
