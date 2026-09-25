# EdTech Expo app

The student app for the LMS, built with Expo and React Native. One codebase runs on Android, iOS and the web. It is used two ways: as a kiosk on classroom tablets that read content from a Raspberry Pi on the school network, and as a phone app that talks to cloud APIs only.

For where this project came from, see [HISTORY.md](HISTORY.md).

## How it fits with the other repos

The app talks to two APIs, and the split matters. In `src/services/api/Api.ts` there are two HTTP clients:

| Variable | Points at | Used for |
|---|---|---|
| `EXPO_PUBLIC_BASE_URL` | The classroom API, [edtech-lms-rpi-api](https://github.com/edtech4good/edtech-lms-rpi-api) | Student login (`/auth/login`), lessons, quizzes, progress, `GET /export/log`, `PUT /import/master` |
| `EXPO_PUBLIC_SYNC_URL` | The central API, [edtech-lms-api](https://github.com/edtech4good/edtech-lms-api) | `GET /sync/content`, `PUT /log/import`, school login (`/auth/school/login`) |

Sync goes like this. The app downloads the curriculum zip from the central API and pushes it to the classroom API. Later it pulls the student log zip from the classroom API and uploads it to the central one. Both APIs issue one access token per user, so a second login anywhere, including from a test run, ends the first session.

The admin and teacher web app is [edtech-lms-ui](https://github.com/edtech4good/edtech-lms-ui). The Playwright smoke suite for this app also lives there, under `e2e/expo-smoke/`.

## What you need

- Node 18.19.1. That is what the EAS build profiles pin.
- Yarn 1. There is a `yarn.lock`; please don't add a `package-lock.json`.
- Android Studio for Android, Xcode for iOS. Neither is needed for web.

Expo SDK 50, React Native 0.73.

## Running it locally

```bash
yarn install
cp env.example .env
yarn start
```

Press `w` for web, `a` for Android, `i` for iOS. `env.example` points at a local stack with the classroom API on 3001 and the central API on 3000.

Expo bakes `EXPO_PUBLIC_*` values into the bundle at build time. After changing `.env`, stop Metro and start it again; `yarn start` already passes `-c` to clear the cache.

### Environment variables

| Variable | What it does | Example |
|---|---|---|
| `EXPO_PUBLIC_BASE_URL` | Classroom API base URL | `http://127.0.0.1:3001` |
| `EXPO_PUBLIC_SYNC_URL` | Central API base URL | `http://127.0.0.1:3000` |
| `EXPO_PUBLIC_RESOURCE_URL` | Where media is served from | `https://your-cdn.example.com` |
| `EXPO_PUBLIC_RESOURCE_PATH` | Path prefix under that host, if any | `media` |
| `EXPO_PUBLIC_ACCESS_TYPE` | `online` for the phone app, which fetches everything over the network and never touches local storage. Unset or `offline` for the tablet kiosk, which reads content from a folder the user grants. Web always behaves as online. | `online` |
| `EXPO_PUBLIC_DEFAULT_THEME` | `corporate` selects the corporate theme. Anything else, including unset, gives the kids theme. | `corporate` |
| `EXPO_PUBLIC_ENV` | A label carried in the EAS build profiles. Nothing in the app reads it today. | `Staging` |

Deployment-specific values are **not** committed here. The `preview` build
profile in `eas.json` deliberately sets no URLs and no theme: those live as
EAS environment variables on the `preview` environment, so that building this
repo never points a stranger's APK at someone else's server. List them with:

```bash
eas env:list --environment preview
```

`preview` currently expects `EXPO_PUBLIC_BASE_URL`, `EXPO_PUBLIC_SYNC_URL`,
`EXPO_PUBLIC_RESOURCE_URL` and `EXPO_PUBLIC_DEFAULT_THEME`. With none of them
set, a `preview` build falls back to the `127.0.0.1` defaults in
`src/services/api/Api.ts` and the kids theme — a local build, not a broken one.

There are two themes, kids and corporate, defined as token files under `src/themes/tokens/`. `yarn test:themes` checks that the two token trees have the same shape and no empty leaves. It is a plain script run with `tsx`, not a Jest suite, and it is the only test in this repo.

## Building

Android builds run through EAS, locally:

```bash
yarn build:android:staging   # eas build -p android --profile preview --local
yarn build:android:prod      # eas build -p android --profile production --local
```

`eas.json` is checked in. The `development` and `preview` profiles carry our own hostnames; the `production` profile still has placeholders. If you are building for another deployment, edit the profile, or start from `eas.example.json`. The EAS project ID lives in `app.json` under `extra.eas.projectId` and is tied to our EAS account, so a fork needs its own.

The web build is a static export:

```bash
yarn build:web    # expo export -p web, output in dist/
```

The static export is served with nginx from a Docker image (see `deploy/edtech-expo-web.Dockerfile`).

## Layout

```
app/                  # Expo Router routes
src/
├── components/
├── screens/
├── services/         # API clients and hooks (sync lives in hooks/useSyncContent.ts)
├── redux/            # Store and slices
├── models/
├── constants/
├── themes/           # kids and corporate token sets, plus the parity script
├── utils/
└── assets/
assets/               # Icons, fonts, splash
public/media/         # Media the demo seeds generate, served by Metro locally
env.example
eas.json
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Before you change a screen, check it on a phone-sized viewport and on a tablet. Most of what we ship is looked at on a cheap Android tablet in a classroom.

## License and support

AGPL-3.0-only, see [LICENSE](LICENSE) and [NOTICE.txt](NOTICE.txt) for the copyright history. In short: you may run, study, change and share this software, and if you run a modified version for others over a network you must offer them your modified source under the same licence. It was MIT-licensed before 22 September 2026; see NOTICE.txt. Questions and bugs go to [GitHub Issues](https://github.com/edtech4good/edtech-expo/issues).
