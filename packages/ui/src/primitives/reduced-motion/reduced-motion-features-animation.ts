// The chunk that `loadMotionFeatures('animation')` loads. It is a module of its
// own, so the bundler puts the features in a chunk that no page loads before it
// hydrates.
export { domAnimation } from 'motion/react'
