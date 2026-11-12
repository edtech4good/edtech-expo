// The first value of the connectivity signal, before any event arrives. Pure so a
// test can read it. On web a screen opened while already offline must start
// offline (the window events only fire on a change); native starts online and
// lets NetInfo answer, as before.
export function initialOffline(
  os: string,
  nav: { onLine?: boolean } | undefined | null,
): boolean {
  return os === 'web' && nav?.onLine === false;
}
