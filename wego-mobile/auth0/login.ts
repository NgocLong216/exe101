// import * as AuthSession from 'expo-auth-session';
// import { discovery, redirectUri } from './auth0';

// export async function login() {
//   console.log('REDIRECT URI:', redirectUri);
//   const request = new AuthSession.AuthRequest({
//     clientId: 'YOUR_CLIENT_ID',
//     scopes: ['openid', 'profile', 'email'],
//     redirectUri,
//     responseType: AuthSession.ResponseType.Token,
//   });

//   const result = await request.promptAsync(discovery);

//   if (result.type === 'success') {
//     return result.authentication;
//   }

//   return null;
// }
