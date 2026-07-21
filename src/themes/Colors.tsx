// Kept for backward compatibility: existing call sites import the kids
// palette from here (or via `@/themes`). The single source of truth now
// lives in `src/themes/tokens/kids.ts`; this file just re-exports it.
import kidsTokens from './tokens/kids';

const light = kidsTokens.colors;

const AppColors = light;
export { light };
export default AppColors;
