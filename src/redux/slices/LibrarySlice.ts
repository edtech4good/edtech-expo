import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { LibraryCurriculum } from '@/models';

const name = 'library';

// Kept across logout, deliberately not wired to clearAllData — same
// reasoning as PendingResultSlice (a shared tablet's unsynced results
// survive a logout so they can still sync later). A shared tablet cycling
// through many learners would otherwise grow this unboundedly in
// AsyncStorage, so it's capped instead: the current learner's entry plus
// the MAX_OTHER_USERS most recently used other learners. recentOwnerIds
// tracks usage order (most recent first) so the cap can evict the least
// recently used entry rather than an arbitrary one.
const MAX_OTHER_USERS = 3;

export interface LibraryUserEntry {
  curricula: LibraryCurriculum[];
  generatedAt: string;
}

interface LibraryState {
  // Keyed by schooluserid (see PendingResultSlice.ownerId for the same
  // pattern) so a shared tablet never shows one learner's cached library to
  // another after a switch — replace the user's entry wholesale on a
  // successful fetch, never merge, and leave it untouched on a failed one
  // so the offline/cached view keeps working.
  byUser: Record<string, LibraryUserEntry>;
  // Most-recently-used first. The owner of the fetch that just landed is
  // always moved to the front — see updateLibrary.
  recentOwnerIds: string[];
}

const initialState: LibraryState = {
  byUser: {},
  recentOwnerIds: [],
};

export const librarySlice = createSlice({
  name,
  initialState,
  reducers: {
    updateLibrary: (
      state,
      action: PayloadAction<{
        ownerId: string;
        curricula: LibraryCurriculum[];
        generatedAt: string;
      }>,
    ) => {
      const { ownerId, curricula, generatedAt } = action.payload;
      state.byUser[ownerId] = { curricula, generatedAt };

      // Bump this user to the front of the recency list.
      state.recentOwnerIds = [
        ownerId,
        ...state.recentOwnerIds.filter(id => id !== ownerId),
      ];

      // Cap at the current user (front of the list) plus MAX_OTHER_USERS
      // others; evict anything past that from both the id list and byUser.
      const keepIds = state.recentOwnerIds.slice(0, 1 + MAX_OTHER_USERS);
      state.recentOwnerIds = keepIds;
      const keepSet = new Set(keepIds);
      Object.keys(state.byUser).forEach(id => {
        if (!keepSet.has(id)) delete state.byUser[id];
      });

      return state;
    },
  },
});

export const getLibraryEntry =
  (ownerId: string | null | undefined) =>
  (state: RootState): LibraryUserEntry | undefined =>
    ownerId ? state.library.byUser[ownerId] : undefined;

export const LibraryActions = librarySlice.actions;
