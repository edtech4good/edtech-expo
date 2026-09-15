import { createContext } from 'react';

/**
 * Height (in px) the visible corporate OfflineBanner adds above a route's
 * content — BANNER_HEIGHT plus any safe-area top inset it also covers (see
 * OfflineBannerFrame's `safeAreaTop` prop) — 0 when the banner isn't shown.
 *
 * Fixed-height layouts that pin themselves to the window
 * (src/components/layouts/Container.tsx,
 * src/services/hooks/useScreenDimension.ts) subtract this the same way
 * they already subtract the bottom tab bar height, so their content and
 * footers aren't clipped when the banner is visible.
 *
 * Lives in src/services (not src/components) so those two consumers can
 * read it via '@/services' — which useScreenDimension.ts already sits
 * inside, and which Container.tsx already imports other hooks from
 * elsewhere in the app — without creating a services -> components import
 * edge. OfflineBannerFrame (src/components/ui/OfflineBannerFrame.tsx)
 * imports this context from '@/services' too and is the only place that
 * provides a non-zero value.
 */
export const OfflineBannerHeightContext = createContext(0);
