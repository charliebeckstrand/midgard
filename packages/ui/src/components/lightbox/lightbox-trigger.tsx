'use client'

import type { ComponentProps, Ref } from 'react'
import { cn, composeEventHandlers } from '../../core'
import { k } from '../../recipes/kata/lightbox'
import { Placeholder } from '../placeholder'
import { useLightboxContext } from './context'
import { thumbnailOf } from './lightbox-utilities'

/** Props for {@link LightboxTrigger}: the index of its photo, and the `<button>` attributes. */
export type LightboxTriggerProps = {
	/**
	 * The index of the photo in the `photos` of the root.
	 * @defaultValue 0
	 */
	index?: number
	/** The `ref` of the button. */
	ref?: Ref<HTMLButtonElement>
} & Omit<ComponentProps<'button'>, 'children' | 'ref' | 'type'>

/**
 * The thumbnail of one photo of a {@link Lightbox}. It is a button that shows
 * the photo, and a press on it opens the viewer at that photo. The photo then
 * rises from the thumbnail to the stage, and it goes back into the thumbnail
 * when the viewer closes. The thumbnail is empty while its photo is up.
 *
 * The image fills the button with `object-fit: cover`. Without a size, the
 * button takes the full width of its line and the aspect ratio of the photo. A
 * size class on the button, such as `aspect-square w-32`, crops the photo to
 * that box. The alternative text of the photo names the button.
 *
 * A photo with no `width` and `height` takes the size of its thumbnail when
 * the thumbnail loads. Until then, a placeholder pulses in the button, and the
 * button is disabled. A thumbnail that does not load leaves a still
 * placeholder in the box of the button, and no button.
 *
 * @remarks A click opens the viewer, as a press on a `DialogTrigger` does. A
 * thumbnail is often in a page that scrolls, so a touch that starts a scroll
 * must not open it.
 */
export function LightboxTrigger({
	index = 0,
	className,
	onClick,
	ref,
	...props
}: LightboxTriggerProps) {
	const { photos, shown, show, register, loadOf, record } = useLightboxContext()

	const photo = photos[index]

	if (!photo) return null

	const source = thumbnailOf(photo)

	const load = loadOf(source)

	if (load === 'failed') {
		return <Placeholder pulse={false} className={cn(k.trigger.base, className)} />
	}

	const ready = Boolean(photo.width && photo.height) || load !== undefined

	return (
		<button
			ref={ref}
			data-slot="lightbox-trigger"
			{...props}
			type="button"
			disabled={!ready || props.disabled}
			onClick={composeEventHandlers(onClick, () => show(index))}
			aria-haspopup="dialog"
			className={cn(k.trigger.base, k.trigger.button, className)}
		>
			{ready ? null : <Placeholder className={k.trigger.placeholder} />}
			<img
				ref={(image) => {
					if (!image) return

					// An image that loaded before hydration fires no `load` event for React.
					if (image.complete && image.naturalWidth > 0) {
						record(source, { width: image.naturalWidth, height: image.naturalHeight })
					}

					return register(index, image)
				}}
				src={source}
				alt={photo.alt}
				width={photo.width}
				height={photo.height}
				draggable={false}
				onLoad={(event) => {
					const { naturalWidth: width, naturalHeight: height } = event.currentTarget

					record(source, { width, height })
				}}
				onError={() => record(source, 'failed')}
				className={cn(k.trigger.image, (shown === index || !ready) && k.trigger.raised)}
			/>
		</button>
	)
}
