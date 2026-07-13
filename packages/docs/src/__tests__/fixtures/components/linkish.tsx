type BaseProps = {
	/** Label rendered inside the control. */
	label: string
}

export type LinkishProps = BaseProps &
	(
		| {
				/** Destination URL; switches the control to an anchor. */
				href: string

				/** Anchor browsing-context target. */
				target?: '_blank' | '_self'

				/** Anchor arm: relation text. */
				probe?: string
				onPress?: never
		  }
		| {
				href?: never

				/** Activation callback for the button branch. */
				onPress?: (value: string) => void

				/** Button arm: activation delay. */
				probe?: number
		  }
	)

/** Anchor-or-button fixture discriminated on `href`; pairs with {@link Chip}. */
export function Linkish({ label, href }: LinkishProps) {
	return href === undefined ? <button type="button">{label}</button> : <a href={href}>{label}</a>
}
