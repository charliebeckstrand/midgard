import { Tabs, type TabsProps } from '../tabs'

/**
 * Props for {@link Segment}: {@link TabsProps} without `variant` or
 * `orientation`. The segment variant pins orientation to horizontal, so
 * neither is part of the surface.
 */
export type SegmentProps = Omit<TabsProps, 'variant' | 'orientation'>

/** Segmented control: preset over `<Tabs variant="segment">` with orientation pinned to horizontal. */
export function Segment(props: SegmentProps) {
	return <Tabs data-slot="segment" variant="segment" {...props} />
}
