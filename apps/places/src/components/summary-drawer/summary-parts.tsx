import type { ReactElement, ReactNode } from 'react'
import { Icon } from 'ui/icon'
import { Lightbox, LightboxTrigger } from 'ui/lightbox'
import { ListItem } from 'ui/list'
import { useDateFormat } from 'ui/providers/locale'
import { Flex } from 'ui/structure/flex'
import { Stack } from 'ui/structure/stack'
import { Text } from 'ui/text'
import type { Photo } from '../../types'
import { DAY_FORMAT } from '../../utilities/places-filter'

/**
 * One fact about a record, with an icon that names the fact. The icon box is one
 * line high, so the icon stays on the first line when the text wraps. The fact
 * is centered on that line, so the middle of a fact that is not text, such as
 * a score, meets the middle of the icon.
 */
export function SummaryFact({ icon, children }: { icon: ReactElement; children: ReactNode }) {
	return (
		<Flex gap="sm" align="start" className="min-w-0">
			<Text as="span" tone="muted" className="flex h-lh shrink-0 items-center">
				<Icon icon={icon} />
			</Text>

			<div className="flex min-h-lh min-w-0 items-center wrap-break-word *:min-w-0">{children}</div>
		</Flex>
	)
}

/**
 * One record as a row of a list: its name, the lines under it, and an end slot
 * that sits in the middle of the two. A press opens the record.
 */
export function SummaryRow({
	name,
	meta,
	end,
	onOpen,
}: {
	name: string
	/** The lines under the name. They are spans, because the row is a button. */
	meta: ReactNode
	end?: ReactNode
	onOpen: () => void
}) {
	return (
		// The `onClick` marks the row interactive, which is where its
		// cursor, focus ring, and hover wash come from — the card variant's
		// wash being an opaque step, so a hovered row stays a surface over
		// the map rather than turning see-through to it. The content area
		// is a button, so Tab reaches each row and Enter or Space opens it.
		<ListItem as="button" type="button" onClick={onOpen}>
			{/* The end slot sits in the middle of the name and the lines under it. */}
			<Flex as="span" justify="between" align="center" gap="sm">
				<Stack as="span" gap="sm" className="min-w-0 text-left">
					<Text as="span" className="font-medium">
						{name}
					</Text>

					{meta}
				</Stack>

				{end}
			</Flex>
		</ListItem>
	)
}

/**
 * A span of stored days on one line, such as `Oct 4 – 9, 2026`. The format
 * leaves out what the two days share, and a span of one day reads as that day.
 * It is a span, so it can go inside the button of a list row.
 */
export function DaySpan({ from, to }: { from: string; to: string }) {
	const format = useDateFormat(DAY_FORMAT)

	return <span>{format.formatRange(new Date(from), new Date(to))}</span>
}

/**
 * Photos in squares of 96 pixels. A press on a square raises its photo into a
 * `Lightbox`, which steps through the photos of the set.
 *
 * The size of a photo is not known before it loads. The `Lightbox` reads the
 * size from the thumbnail, and a placeholder pulses in the square until then.
 * A photo that does not load leaves a still placeholder, and the viewer steps
 * over it. The name of the record is the alt text because it is the one thing
 * known about the picture.
 *
 * Squares, stated on both axes, so every photo reads the same however it was
 * shot, and the row wraps them at any panel width. The fixed box also keeps
 * the text below in position while the photo loads. The trigger fills the box
 * with `object-fit: cover` and crops the overflow, which is what makes one size
 * honest for any aspect.
 */
export function SummaryPhotos({ photos, alt }: { photos: readonly Photo[]; alt: string }) {
	return (
		<Lightbox
			photos={photos.map((photo) => ({ src: photo.url, alt }))}
			aria-label={`Photos of ${alt}`}
		>
			<Flex gap="sm" wrap>
				{photos.map((photo, at) => (
					<LightboxTrigger key={photo.key} index={at} className="size-24 shrink-0" />
				))}
			</Flex>
		</Lightbox>
	)
}
