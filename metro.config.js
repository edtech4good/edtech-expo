const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// On web the upstream drawer animates with a reanimated spring that strands a
// residual translateX when frames are interrupted mid-flight (drawer sliver /
// gap stuck on screen until reload). src/vendor/react-navigation-drawer/
// DrawerWeb.js is a copy of the upstream module with the spring replaced by a
// direct set; the resolver below swaps it in for web bundles only.
// The vendored file tracks this exact upstream version — re-diff it on upgrade.
const PATCHED_DRAWER_VERSION = '6.7.2';
const drawerVersion = require('@react-navigation/drawer/package.json').version;
if (drawerVersion !== PATCHED_DRAWER_VERSION) {
  throw new Error(
    `@react-navigation/drawer is ${drawerVersion}, but ` +
      `src/vendor/react-navigation-drawer/DrawerWeb.js was vendored from ` +
      `${PATCHED_DRAWER_VERSION}. Re-diff the vendored file against ` +
      `node_modules/@react-navigation/drawer/lib/module/views/modern/Drawer.js ` +
      `and bump PATCHED_DRAWER_VERSION in metro.config.js.`,
  );
}

module.exports = (() => {
  const config = getDefaultConfig(__dirname);

  const { transformer, resolver } = config;

  config.transformer = {
    ...transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  };
  config.resolver = {
    ...resolver,
    assetExts: [
      ...resolver.assetExts.filter(ext => ext !== 'svg'),
      'ttf',
      'otf',
    ],
    sourceExts: [...resolver.sourceExts, 'svg'],
    resolveRequest: (context, moduleName, platform) => {
      if (
        platform === 'web' &&
        moduleName === './modern/Drawer' &&
        /[\\/]@react-navigation[\\/]drawer[\\/]lib[\\/](module|commonjs)[\\/]views[\\/]DrawerView\.js$/.test(
          context.originModulePath,
        )
      ) {
        return {
          type: 'sourceFile',
          filePath: path.resolve(
            __dirname,
            'src/vendor/react-navigation-drawer/DrawerWeb.js',
          ),
        };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  };

  return config;
})();
