import { router } from 'expo-router';
import BackButton from './BackButton';

interface Props {
  fallback: string;
}

// A web reload or a direct link lands on these screens with a fresh,
// one-entry navigation stack (the persisted redux selection is what lets the
// screen render at all). The stock header only draws a back arrow when the
// stack has history, so straight after a reload there is none. Fall back to
// the screen's logical parent when there is nothing to go back to.
export default function LearnerBackButton({ fallback }: Props) {
  return (
    <BackButton
      onPress={() =>
        router.canGoBack() ? router.back() : router.navigate(fallback)
      }
    />
  );
}
