# Working in this repository

The learner and teacher app of an open-source learning platform (Expo / React
Native, Android first, also exported to the web). It talks to the student API
(edtech-lms-rpi-api), online or on a classroom server. **This repository is
public.** Read this file before changing anything.

## What may never be committed here

- Credentials, keys, tokens, real hostnames, or environment files with real
  values (`env.example` is the template). The release keystore is not in git.
- The name of any customer, school, organisation or person, including in
  fixtures, screenshots and commit messages. Invent names.
- Test media taken from anyone's personal files. Use synthetic media.
- A description of a server weakness. Findings go to the private tracker.

## What the app relies on from the student API

- A learner or teacher token now carries the school and the organisation; a
  token without them, or one issued before the claims existed, is refused and
  the app returns to sign-in. Sign-in is the only recovery; keep that path
  clear of anything that depends on a stored session.
- Content the learner may not see answers as if it did not exist (404), and
  lists (`curriculum/all`, `grade/all`, `level/all`, `Lesson/all`) return only
  the learner's scope. Screens must handle a 404 and an empty list as normal
  answers, not as errors to retry.
- Results are scored by the server against the container's own questions; a
  submitted item the container does not hold is dropped silently.
- One token per user: signing in anywhere evicts the previous session. A full
  JS reload (cold start, a hook-file edit, a crash) lands on sign-in.

## Design

Two visual directions coexist: the kids theme and the corporate theme, chosen
by the school. Read the design notes before touching UI; the corporate theme
has no points, mascots or kids iconography. Khmer is the product's language:
check layouts with Khmer strings, which run longer and taller than English.

## Tests and verification

- The unit scripts are `yarn test:*` (plain `tsx`, no runner). Web e2e lives in
  the admin repo's `e2e/expo-smoke` (Playwright against `expo export -p web`).
- On a device or emulator, verify the real thing: a screen that typechecks is
  not a screen that works. Pace key events on an emulator; disable the
  software keyboard before typing into fields.
- **Prove a new assertion can fail** before trusting it.
- Builds are the owner's call: ask before any `eas build`, and bump the version
  first. Artifact download links expire quickly; download once and send the
  file.

## Git

Branch from `origin/main`; `main` is protected (PR + CI). Squash merge; never
delete a branch that is the base of another PR. `yarn`, not `npm`.
