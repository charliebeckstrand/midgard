'use client'

// The `m` elements of the library. A component imports them as
// `import * as m from '.../reduced-motion-elements'` and renders them under a
// `ReducedMotion` root.
//
// The list holds only the tags that the library renders. A namespace import of
// `motion/react-m` puts each of its 164 elements in the bundle, because the
// bundler keeps the whole namespace object. To animate a new tag, add it here.
export { circle, create, div, g, li, path, rect, span, text } from 'motion/react-m'
