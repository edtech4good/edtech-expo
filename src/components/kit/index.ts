// The shared corporate question kit (docs/design/corporate-question-types).
// Corporate-theme schools only: kids-theme schools keep today's screens.
export { default as MovableTile, AUDIO_RESERVE } from './MovableTile';
export type { MovableTileProps } from './MovableTile';
export { default as Slot } from './Slot';
export type { SlotProps } from './Slot';
export { default as ResultMark } from './ResultMark';
export { default as ResultStrip } from './ResultStrip';
export type { ResultStripProps } from './ResultStrip';
export { default as QuestionColumn, QUESTION_COLUMN_WIDTH } from './QuestionColumn';
export { default as ListenPill } from './ListenPill';
export { default as OptionAudioCircle, OPTION_AUDIO_SIZE } from './OptionAudioCircle';
export { audioManager, AudioManager } from './audio/audioManager';
export { useAudioClip } from './audio/useAudioClip';
export { useReplayClip } from './audio/useReplayClip';
export { tileFrame, tileFrameStyle, slotFrame, TILE_STATES, SLOT_STATES } from './tileStyle';
export type { TileState, SlotState, TileFrame, SlotFrame } from './tileStyle';
export { footerActions, resultSummary, resultTitle, resultAnnouncement } from './resultLogic';
export { AnnouncerProvider, useAnnouncer } from './Announcer';
