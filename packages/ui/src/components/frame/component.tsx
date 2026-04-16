import { FlexBase, type FlexProps } from '../flex'

export type FrameProps = FlexProps

/** Structural layout container. No default gap or alignment — children stretch naturally. */
export function Frame(props: FrameProps) {
	return <FlexBase dataSlot="frame" {...props} />
}
