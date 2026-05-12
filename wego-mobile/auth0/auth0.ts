import * as AuthSession from 'expo-auth-session';

export const domain = process.env.EXPO_PUBLIC_AUTH0_DOMAIN!;
export const clientId = process.env.EXPO_PUBLIC_AUTH0_CLIENT_ID!;

export const redirectUri = AuthSession.makeRedirectUri({
  scheme: 'myapp',
});

console.log('REDIRECT URI:', redirectUri);

export const discovery = {
  authorizationEndpoint: `https://${domain}/authorize`,
  tokenEndpoint: `https://${domain}/oauth/token`,
};
