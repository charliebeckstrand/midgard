import { cn } from '../../core'
import { Alert, type AlertProps } from '../alert'

/** Props for {@link Banner}; the full {@link AlertProps} surface minus `full` (always on), plus `position`. */
export type BannerProps = Omit<AlertProps, 'full'> & {
	/**
	 * Pin the banner to the top of its scroll container.
	 * @defaultValue 'static'
	 */
	position?: 'static' | 'sticky'
}

/**
 * Full-width, page-level message bar built on {@link Alert} with `full` forced
 * on and square corners. Closable by default and optionally `sticky` to pin it
 * to the top of its scroll container; forwards Alert's severity, slots, and
 * open-state controls.
 *
 * @remarks Unlike Alert, `closable` defaults to `true`.
 */
export function Banner({ position = 'static', closable = true, className, ...props }: BannerProps) {
	return (
		<Alert
			full
			data-slot="banner"
			closable={closable}
			className={cn('rounded-none', position === 'sticky' && 'sticky top-0 z-40', className)}
			{...props}
		/>
	)
}
