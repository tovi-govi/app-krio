require('dotenv/config');
const base = require('./app.json');

module.exports = ({ config }) => ({
  expo: {
    ...base.expo,
    ...config,
    android: {
      ...(base.expo.android || {}),
      ...(config.android || {}),
    },
    ios: {
      ...(base.expo.ios || {}),
      ...(config.ios || {}),
    },
    extra: {
      ...(base.expo.extra || {}),
      ...(config.extra || {}),
      firebaseApiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
    },
  },
});
