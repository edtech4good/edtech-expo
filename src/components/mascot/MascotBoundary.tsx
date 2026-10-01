import { Component, ReactNode } from 'react';

/**
 * The mascot is decoration (result screen, quiz intro, empty states). If anything in it fails (the lazy Lottie chunk
 * cannot download offline, lottie throws, bad JSON, native module missing) the
 * slot renders nothing and the screen carries on. Never rethrows.
 */
export default class MascotBoundary extends Component<
  { children?: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  private warned = false;

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (this.warned) return;
    this.warned = true;
    console.warn('Mascot failed to render; continuing without it.', error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
