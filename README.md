# EdTech Expo App

A React Native/Expo application for educational technology, designed to work in both online and offline modes.

## In the full system

Expo is the **cross-platform** student/teacher client (mobile + web). It uses **two HTTP base URLs** in code ([`src/services/api/Api.ts`](src/services/api/Api.ts)):

| Variable | Typical use |
|----------|-------------|
| **`EXPO_PUBLIC_BASE_URL`** | **Raspberry Pi / classroom API** — student auth, `GET /export/log`, `PUT /import/master`, most lesson APIs. |
| **`EXPO_PUBLIC_SYNC_URL`** | **Central LMS API** — e.g. `GET /sync/content`, `PUT /log/import`, `POST /auth/school/login`. |

Full sync sequence: [**ARCHITECTURE.md**](../ARCHITECTURE.md) § Sync playbook. Legacy user flows: [**docs/**](../docs/README.md).

**Local dev (web first):** run central + Pi APIs, then Expo with `localhost` URLs in `.env` and press **`w`** after `npm start` — see [**LOCAL_DEVELOPMENT.md**](../LOCAL_DEVELOPMENT.md).

## 🚀 Quick Start

### Prerequisites

- Node.js (v18.19.1 or higher; LTS recommended)
- npm or yarn
- Expo CLI
- Android Studio (for Android development)
- Xcode (for iOS development, macOS only)

### Installation

1. **Get the code** — clone or copy this repo (see parent [**ARCHITECTURE.md**](../ARCHITECTURE.md) for sibling projects).

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Environment Setup**
   
   Copy the example environment file and configure it with your settings:
   ```bash
   cp env.example .env
   ```
   
   Update the `.env` file with your actual configuration:
   ```env
   EXPO_PUBLIC_ENV=Staging
   EXPO_PUBLIC_ACCESS_TYPE=online
   EXPO_PUBLIC_BASE_URL=https://your-api-server.com
   EXPO_PUBLIC_SYNC_URL=https://your-sync-server.com
   EXPO_PUBLIC_RESOURCE_URL=https://your-resource-server.com
   EXPO_PUBLIC_RESOURCE_PATH=your-resource-path%
   ```

4. **Firebase Configuration** (if using Firebase hosting)
   
   Copy the Firebase configuration example:
   ```bash
   cp .firebaserc.example .firebaserc
   ```
   
   Update `.firebaserc` with your Firebase project details:
   ```json
   {
     "projects": {
       "default": "your-firebase-project-id"
     },
     "targets": {
       "your-firebase-project-id": {
         "hosting": {
           "staging": ["your-staging-target"],
           "prod": ["your-production-target"]
         }
       }
     }
   }
   ```

5. **EAS Configuration** (for building with Expo Application Services)
   
   Copy the EAS configuration example:
   ```bash
   cp eas.example.json eas.json
   ```
   
   Update `eas.json` with your build environment URLs.

6. **Update app.json**
   
   Replace the EAS project ID in `app.json`:
   ```json
   {
     "extra": {
       "eas": {
         "projectId": "your-eas-project-id"
       }
     }
   }
   ```

## 🏃‍♂️ Running the App

### Development Mode
```bash
# Start the development server
npm start
# or
yarn start
```

### Platform Specific
```bash
# Android
npm run android
# or
yarn android

# iOS
npm run ios
# or
yarn ios

# Web
npm run web
# or
yarn web
```

### Environment Specific
```bash
# Production mode
npm run run:prod
# or
yarn run:prod

# Staging mode
npm run run:staging
# or
yarn run:staging
```

## 🏗️ Building

### Android APK
```bash
# Staging build
npm run build:android:staging
# or
yarn build:android:staging

# Production build
npm run build:android:prod
# or
yarn build:android:prod
```

### Web Build
```bash
npm run build:web
# or
yarn build:web
```

## 🚀 Deployment

### Firebase Hosting
```bash
# Deploy to staging
npm run deploy:staging
# or
yarn deploy:staging

# Deploy to production
npm run deploy:prod
# or
yarn deploy:prod
```

## 📁 Project Structure

```
edtech-expo/
├── app/                    # Expo Router app directory
├── src/
│   ├── components/         # Reusable React components
│   ├── screens/           # Screen components
│   ├── services/          # API services and hooks
│   ├── redux/             # Redux store and slices
│   ├── models/            # TypeScript type definitions
│   ├── constants/         # App constants
│   ├── themes/            # Styling themes
│   ├── utils/             # Utility functions
│   └── assets/            # Static assets
├── assets/                # Expo assets (icons, fonts, etc.)
├── .env.example           # Environment variables template
├── .firebaserc.example    # Firebase configuration template
├── eas.example.json       # EAS build configuration template
└── README.md              # This file
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `EXPO_PUBLIC_ENV` | Environment type | `Staging`, `Production`, `Development` |
| `EXPO_PUBLIC_ACCESS_TYPE` | Access mode | `online`, `offline` |
| `EXPO_PUBLIC_BASE_URL` | **Pi / classroom** API base (lessons, Pi import/export) | `http://192.168.x.x:3000` |
| `EXPO_PUBLIC_SYNC_URL` | **Central LMS** API base (sync content, log import, school login) | `https://your-lms-api.example.com` |
| `EXPO_PUBLIC_RESOURCE_URL` | Static assets server URL | `https://your-resource-server.com` |
| `EXPO_PUBLIC_RESOURCE_PATH` | Resource path for assets | `your-resource-path%` |

### Firebase Configuration

The app uses Firebase for hosting. Configure your Firebase project in `.firebaserc`:

```json
{
  "projects": {
    "default": "your-firebase-project-id"
  },
  "targets": {
    "your-firebase-project-id": {
      "hosting": {
        "staging": ["your-staging-target"],
        "prod": ["your-production-target"]
      }
    }
  }
}
```

### EAS Configuration

For building with Expo Application Services, configure `eas.json`:

```json
{
  "build": {
    "preview": {
      "env": {
        "EXPO_PUBLIC_BASE_URL": "https://your-staging-api-server.com",
        "EXPO_PUBLIC_SYNC_URL": "https://your-staging-sync-server.com",
        "EXPO_PUBLIC_RESOURCE_URL": "https://your-staging-resource-server.com"
      }
    },
    "production": {
      "env": {
        "EXPO_PUBLIC_BASE_URL": "https://your-production-api-server.com",
        "EXPO_PUBLIC_SYNC_URL": "https://your-production-sync-server.com",
        "EXPO_PUBLIC_RESOURCE_URL": "https://your-production-resource-server.com"
      }
    }
  }
}
```

## 🔒 Security Notes

- Never commit `.env` files or any files containing sensitive information
- The `.gitignore` file is configured to exclude sensitive files
- Use environment variables for all configuration that varies between environments
- Keep API keys and secrets secure and never expose them in client-side code

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

If you encounter any issues or have questions, use your team’s issue tracker or internal docs.

## 🔄 Updates

Keep your dependencies up to date:

```bash
npm update
# or
yarn upgrade
```

Check for Expo SDK updates:

```bash
npx expo install --fix
```
