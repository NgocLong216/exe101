import * as AuthSession from 'expo-auth-session';
import { clientId, discovery, domain, redirectUri } from './auth0';

export async function loginWith(
  provider: 'google-oauth2' | 'facebook'
) {
  const request = new AuthSession.AuthRequest({
    clientId,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    responseType: AuthSession.ResponseType.Code,
    usePKCE: true,
    extraParams: {
      connection: provider,
    },
  });

  const result = await request.promptAsync(discovery);

  //console.log('AUTH RESULT:', redirectUri);

  if (result.type !== 'success' || !result.params.code) {
    return null;
  }

  // EXCHANGE CODE → TOKEN
  const tokenResult = await AuthSession.exchangeCodeAsync(
    {
      clientId,
      code: result.params.code,
      redirectUri,
      extraParams: {
        code_verifier: request.codeVerifier!,
      },
    },
    {
      tokenEndpoint: `https://${domain}/oauth/token`,
    }
  );

  //console.log('TOKEN RESULT:', tokenResult);

  return tokenResult;
}
