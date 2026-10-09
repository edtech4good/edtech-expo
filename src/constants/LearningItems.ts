/**
 * The lesson's learning slot is an ordered list of typed items (design note
 * "Learning items", docs/content-learning-items-design.md in the workspace
 * repo, §4 and §8). Phase 0 ships one type, `video`, which is every learning
 * item that existed before types did.
 *
 * SUPPORTED_LEARNING_ITEM_TYPES is the single source of truth for what this
 * build can render. Two things read it and nothing else may repeat it:
 *   - the `X-Learning-Item-Types` request header sent to the student API
 *     (Api.ts), which tells the server what this build renders;
 *   - the type -> renderer decision (`isLearningItemSupported`) that the
 *     lesson screen uses to open an item or show the placeholder.
 * Adding a viewer for a new type means adding it here, in one place, and
 * writing its renderer.
 */
export const SUPPORTED_LEARNING_ITEM_TYPES = ['video'] as const;

export type SupportedLearningItemType =
  (typeof SUPPORTED_LEARNING_ITEM_TYPES)[number];

/** Header name; sent by the student API client only, never the central one. */
export const LEARNING_ITEM_TYPES_HEADER = 'X-Learning-Item-Types';

/** The header's value: the comma-separated types this build renders. */
export const SUPPORTED_LEARNING_ITEM_TYPES_HEADER_VALUE =
  SUPPORTED_LEARNING_ITEM_TYPES.join(',');

/** The type an item has when the server (or a cached payload) names none. */
export const DEFAULT_LEARNING_ITEM_TYPE: SupportedLearningItemType = 'video';

/**
 * The item's type. A payload from before types existed (an older server, or
 * a lesson cached on the device by an older build) has no
 * `lessonlearningtype`; every such item was a video, so missing, empty or
 * not-a-string all mean `video`.
 */
export function resolveLearningItemType(
  item: { lessonlearningtype?: unknown } | null | undefined,
): string {
  const type = item?.lessonlearningtype;
  return typeof type === 'string' && type.trim() !== ''
    ? type.trim()
    : DEFAULT_LEARNING_ITEM_TYPE;
}

/** True when this build has a renderer for the item's type. */
export function isLearningItemSupported(
  item: { lessonlearningtype?: unknown } | null | undefined,
): boolean {
  return (SUPPORTED_LEARNING_ITEM_TYPES as readonly string[]).includes(
    resolveLearningItemType(item),
  );
}

/**
 * Which renderer an item gets. 'video' opens the player; 'unsupported' shows
 * the "needs a newer version of the app" placeholder, is not openable, and
 * posts no progress (design note §4: it must never reach the empty-source
 * auto-complete).
 */
export type LearningItemRenderer = 'video' | 'unsupported';

export function learningItemRenderer(
  item: { lessonlearningtype?: unknown } | null | undefined,
): LearningItemRenderer {
  return isLearningItemSupported(item) ? 'video' : 'unsupported';
}
