import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../Store';
import { CertificatesOverview } from '@/models';
import { clearAllData } from '../CommonAction';
import { markCertificatesSeen } from '@/screens/MyProgress/certificates/certificatesLogic';

export interface StudentCertificatesState {
  overview?: CertificatesOverview;
  /** null until the first successful fetch (then every certificate found is "seen"). */
  seenCertificateIds: string[] | null;
}

interface Props {
  byStudent: Record<string, StudentCertificatesState>;
}

const name = 'certificates';

const initialState: Props = { byStudent: {} };

const entry = (state: Props, studentId: string): StudentCertificatesState => {
  state.byStudent ??= {};
  return (state.byStudent[studentId] ??= { seenCertificateIds: null });
};

// Persisted (persistWhitelist.ts) so My progress shows the last-known
// certificates offline and "seen" survives a restart.
export const certificatesSlice = createSlice({
  name,
  initialState,
  reducers: {
    setCertificatesOverview: (
      state,
      action: PayloadAction<{
        overview: CertificatesOverview;
        seenCertificateIds: string[];
      }>,
    ) => {
      const e = entry(state, action.payload.overview.studentId);
      e.overview = action.payload.overview;
      e.seenCertificateIds = action.payload.seenCertificateIds;
    },
    markCertificatesSeen: (
      state,
      action: PayloadAction<{ studentId: string; ids: string[] }>,
    ) => {
      const e = entry(state, action.payload.studentId);
      e.seenCertificateIds = markCertificatesSeen(
        e.seenCertificateIds,
        action.payload.ids,
      );
    },
  },
  extraReducers: builder => {
    builder.addCase(clearAllData, () => initialState);
  },
});

// A device from before this slice has no `certificates` key; redux-persist then
// keeps the reducer's initial state, but selectors stay defensive.
export const getStudentCertificates =
  (studentId: string | undefined) =>
  (state: RootState): StudentCertificatesState | undefined =>
    studentId ? state.certificates?.byStudent?.[studentId] : undefined;

export const CertificatesActions = certificatesSlice.actions;
