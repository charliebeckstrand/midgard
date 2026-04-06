import { extend, soft, softHover, solid, solidHover, withHover } from './palette'

export const badgeSoft = withHover(
	{ ...soft, ...extend.soft },
	{ ...softHover, ...extend.softHover },
	'group-hover:',
)

export const badgeSolid = withHover(
	{ ...solid, ...extend.solid },
	{ ...solidHover, ...extend.solidHover },
	'group-hover:',
)
