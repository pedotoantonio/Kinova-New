const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer = {
  ...config.transformer,
  minifierConfig: {
    compress: {
      drop_console: false,
    },
  },
};

config.cacheStores = [];

config.resetCache = false;

module.exports = config;
