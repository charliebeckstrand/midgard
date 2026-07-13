import type { ReactNode } from 'react'

/** Props for the factory-made {@link Stamp}. */
type StampProps = {
	/** Status text on the stamp face. */
	label: string

	/** Ink color of the stamp face. */
	tone?: 'zinc' | 'iris'
}

/** Component factory standing in for `createSkeleton`-style helpers. */
function makeThing(seed: StampProps): (props: StampProps) => ReactNode {
	return (props) => <span data-tone={props.tone ?? seed.tone}>{props.label}</span>
}

/** Inked status stamp produced by a factory call rather than a declaration. */
export const Stamp = makeThing({ label: 'ok' })

type BoxedProps = {
	/** Content width step. */
	width?: 'narrow' | 'wide'
}

/** Identity wrapper standing in for `memo`; keeps no inline function in the call. */
function wrapMemo<P>(component: (props: P) => ReactNode): (props: P) => ReactNode {
	return component
}

function BoxedImpl({ width = 'narrow' }: BoxedProps) {
	return <div data-width={width} />
}

/** Identifier-wrapped component: the call arguments hold no function literal. */
export const Boxed = wrapMemo(BoxedImpl)

/** Factory for a nullary divider: a JSX-returning signature with no parameters. */
function makeRule(): () => ReactNode {
	return () => <hr />
}

/** Divider produced by a nullary factory; classifies via its JSX return alone. */
export const Rule = makeRule()

/** Factory whose product transforms strings — callable, but no component shape. */
function makeFormatter(): (value: string) => string {
	return (value) => value.toUpperCase()
}

/** PascalCase yet not a component: takes a string, returns a string. */
export const Formatter = makeFormatter()
