import { cn } from '../../core'
import { Alert, type AlertProps } from '../alert'

export type BannerProps = Omit<AlertProps, 'block'> & {
	/** Pin the banner to its scroll container. */
	position?: 'static' | 'sticky'
}

/**
 * A full-width, page-level message bar. Built on Alert with rounded corners
 * removed and `block` always enabled. Closable by default.
 */
export function Banner({ position = 'static', closable = true, className, ...props }: BannerProps) {
	return (
		<Alert
			block
			closable={closable}
			className={cn('rounded-none', position === 'sticky' && 'sticky top-0 z-40', className)}
			{...props}
		/>
	)
}
