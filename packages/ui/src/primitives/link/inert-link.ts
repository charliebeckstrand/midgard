import type { ComponentProps } from 'react'

/** The attributes that only an anchor reads. @internal */
type AnchorOnlyKey = 'href' | 'target' | 'rel' | 'download' | 'hrefLang' | 'ping' | 'referrerPolicy'

/**
 * The props of a disabled link row, for the inert `<span>` that renders in its
 * place. It removes the attributes that only an anchor reads, and the click
 * handler, which must not run on a disabled row. The other attributes stay, so
 * that an `aria-label`, a `title`, or a `data-*` attribute of the caller stays
 * on the row. This module carries no `'use client'` directive.
 *
 * @param props - The host props of the link row.
 * @returns The props without the anchor attributes and without `onClick`.
 * @internal
 */
export function inertLinkProps<T extends Partial<ComponentProps<'a'>>>({
	href: _href,
	target: _target,
	rel: _rel,
	download: _download,
	hrefLang: _hrefLang,
	ping: _ping,
	referrerPolicy: _referrerPolicy,
	onClick: _onClick,
	...rest
}: T): Omit<T, AnchorOnlyKey | 'onClick'> {
	return rest
}
