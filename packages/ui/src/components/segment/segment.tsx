import { Tabs, type TabsProps } from '../tabs'

/**
 * Segmented control — a thin preset over `<Tabs variant="segment">`.
 * The segment variant pins orientation to horizontal, so it is not part of
 * the surface.
 */
export type SegmentProps = Omit<TabsProps, 'variant' | 'orientation'>

/** Segmented control — preset over `<Tabs variant="segment">` with orientation pinned to horizontal. */
export function Segment(props: SegmentProps) {
	return <Tabs data-slot="segment" variant="segment" {...props} />
}
