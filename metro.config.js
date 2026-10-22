const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Rive animations are bundled with `require('./file.riv')`.
config.resolver.assetExts.push('riv');

module.exports = config;
