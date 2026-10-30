import { type ComponentProps, createElement } from 'react'
import { createContext } from '../core'

/** Tells if an element above is the `<main>` of a layout. */
const [InMainContext, useInMain] = createContext<boolean>('InMain', { default: false })

/**
 * The main landmark of a layout: a `<main>`, or a `<div>` inside the main
 * landmark of another layout.
 *
 * @remarks
 * A document has one main landmark, and HTML does not let a `<main>` hold
 * another `<main>`. A layout can sit in the body of another layout, such as
 * the preview of an app on a page of docs. The inner layout then renders its
 * main slot as a `<div>`, so the page keeps one main landmark. Each attribute
 * and the `ref` reach the element in both cases.
 *
 * @internal
 */
export function MainLandmark(props: ComponentProps<'main'>) {
	const nested = useInMain()

	return <InMainContext value>{createElement(nested ? 'div' : 'main', props)}</InMainContext>
}
