import { cn } from '../../core'
import { Alert, type AlertProps } from '../alert'

/** Props for {@link Banner}; the full {@link AlertProps} surface plus `sticky`. */
export type BannerProps = AlertProps & {
	/**
	 * Pin the banner to the top of its scroll container.
	 * @defaultValue false
	 */
	sticky?: boolean
}

/**
 * Full-width, page-level message bar built on {@link Alert}, with square
 * corners. Closable by default and optionally `sticky` to pin it to the top of
 * its scroll container. It forwards the severity, the content props (`title`,
 * `description`, `actions`, and `children`), and the open-state controls of
 * Alert.
 *
 * @remarks Unlike Alert, `closable` defaults to `true`.
 */
export function Banner({ sticky = false, closable = true, className, ...props }: BannerProps) {
	return (
		<Alert
			data-slot="banner"
			closable={closable}
			className={cn('w-full rounded-none', sticky && 'sticky top-0 z-40', className)}
			{...props}
		/>
	)
}
