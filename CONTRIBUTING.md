# Contributing

Thank you for your interest in contributing. This document explains the workflow and what to verify before opening a pull request.

How to get the code and run it locally

See the README. It covers installation with Yarn 1, configuration, how to run the app locally, and how to build for Android and web.

Branch and pull request workflow

Branch from main with a descriptive name. Make your changes in that branch. When ready, push to your fork and open a pull request. The PR will be squash merged into main.

What to verify before opening a PR

If you changed a theme token, run the theme verification:

```bash
yarn test:themes
```

If you changed a screen, check it on a phone-sized viewport and on a tablet. Most of what ships is looked at on a cheap Android tablet in a classroom.

Test data and one access token per user

Each user gets one access token at a time. A second login ends the first session. Coordinate if you run multiple test suites at once.

License

By contributing to this project, you agree that your contributions will be licensed under the MIT License.
