import { router } from 'expo-router';
import BackButton from './BackButton';

interface Props {
  fallback: string;
  /** Forwarded to BackButton — 'chevron' for the corporate app bar's 20px
   * "‹" glyph (handoff §3); 'default' (the fallback) keeps the Material
   * keyboard-backspace arrow used everywhere else. */
  variant?: 'default' | 'chevron';
}

// A web reload or a direct link lands on these screens with a fresh,
// one-entry navigation stack (the persisted redux selection is what lets the
// screen render at all). The stock header only draws a back arrow when the
// stack has history, so straight after a reload there is none. Fall back to
// the screen's logical parent when there is nothing to go back to.
export default function LearnerBackButton({ fallback, variant }: Props) {
  return (
    <BackButton
      variant={variant}
      onPress={() =>
        router.canGoBack() ? router.back() : router.navigate(fallback)
      }
    />
  );
}
