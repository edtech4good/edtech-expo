// Session-only memory that the learning server has no certificates route (404).
// Kept apart so the slice can clear it on logout without importing the flow.
let unsupported = false;
export const isCertificatesUnsupported = (): boolean => unsupported;
export const markCertificatesUnsupported = (): void => {
  unsupported = true;
};
export const resetCertificatesUnsupported = (): void => {
  unsupported = false;
};
