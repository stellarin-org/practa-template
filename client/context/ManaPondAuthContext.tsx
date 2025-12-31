import { createContext, useContext, useCallback, useEffect, useState, ReactNode } from 'react';
import { makeRedirectUri, useAuthRequest } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { MANAPOND_CONFIG } from '@/config/oauth';
import { getApiUrl } from '@/lib/query-client';
import { getOrCreateDeviceId } from '@/lib/device-id';

// Authorization goes directly to ManaPond (browser redirect)
// Token/userinfo/revoke go through our proxy to avoid CORS
// Use URL constructor to avoid double slashes
const getProxyUrl = (path: string) => {
  const base = getApiUrl();
  return new URL(path, base).href;
};

// Discovery for expo-auth-session (authorization only - token handled manually)
const discovery = {
  authorizationEndpoint: `${MANAPOND_CONFIG.baseUrl}/api/oauth/authorize`,
  tokenEndpoint: `${MANAPOND_CONFIG.baseUrl}/api/oauth/token`, // Not used directly
  revocationEndpoint: `${MANAPOND_CONFIG.baseUrl}/api/oauth/revoke`, // Not used directly
};

// Proxied endpoints - computed lazily to avoid module initialization issues
const getTokenEndpoint = () => getProxyUrl('/api/oauth/token');
const getRevokeEndpoint = () => getProxyUrl('/api/oauth/revoke');
const getUserInfoUrl = () => getProxyUrl('/api/oauth/userinfo');
const getLinkDeviceUrl = () => getProxyUrl('/api/auth/link-device');

const TOKEN_KEYS = {
  accessToken: 'manapond_access_token',
  refreshToken: 'manapond_refresh_token',
  expiresAt: 'manapond_expires_at',
};

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
}

interface UserInfo {
  sub: string;
  email: string;
  username?: string;
  avatar_url?: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserInfo | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  getAccessToken: () => Promise<string | null>;
  isReady: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const redirectUri = makeRedirectUri({
  scheme: 'stellarin',
  path: 'oauth-callback',
});

async function secureStoreGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureStoreSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }
  return SecureStore.setItemAsync(key, value);
}

async function secureStoreDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    localStorage.removeItem(key);
    return;
  }
  return SecureStore.deleteItemAsync(key);
}

export function ManaPondAuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<UserInfo | null>(null);

  const [request, response, promptAsync] = useAuthRequest(
    {
      clientId: MANAPOND_CONFIG.clientId,
      scopes: MANAPOND_CONFIG.scopes,
      redirectUri,
      usePKCE: true,
    },
    discovery
  );

  // Debug: Log OAuth URL when request is ready
  useEffect(() => {
    if (request) {
      console.log('OAuth Debug - Full Auth URL:', request.url);
      console.log('OAuth Debug - Redirect URI:', redirectUri);
      console.log('OAuth Debug - Client ID:', MANAPOND_CONFIG.clientId);
      console.log('OAuth Debug - Code Challenge:', request.codeChallenge);
      console.log('OAuth Debug - Code Challenge Method:', request.codeChallengeMethod);
    }
  }, [request]);

  // Handle OAuth callback on web (full page redirect)
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      
      if (code && state) {
        console.log('OAuth Debug - Found code in URL, exchanging for tokens');
        // Clear the URL params to prevent re-processing
        window.history.replaceState({}, document.title, url.pathname);
        
        // We need to get the code verifier from session storage
        const storedVerifier = sessionStorage.getItem('oauth_code_verifier');
        if (storedVerifier) {
          exchangeCodeWithVerifier(code, storedVerifier);
        } else {
          console.error('OAuth Debug - No code verifier found in session storage');
        }
      }
    }
  }, []);

  async function storeTokens(tokens: TokenResponse) {
    const expiresAt = Date.now() + tokens.expires_in * 1000;
    await Promise.all([
      secureStoreSet(TOKEN_KEYS.accessToken, tokens.access_token),
      secureStoreSet(TOKEN_KEYS.refreshToken, tokens.refresh_token),
      secureStoreSet(TOKEN_KEYS.expiresAt, expiresAt.toString()),
    ]);
  }

  async function clearTokens() {
    await Promise.all([
      secureStoreDelete(TOKEN_KEYS.accessToken),
      secureStoreDelete(TOKEN_KEYS.refreshToken),
      secureStoreDelete(TOKEN_KEYS.expiresAt),
    ]);
    setUser(null);
    setIsAuthenticated(false);
  }

  async function refreshAccessToken(): Promise<boolean> {
    try {
      const refreshToken = await secureStoreGet(TOKEN_KEYS.refreshToken);
      if (!refreshToken) return false;

      const res = await fetch(getTokenEndpoint(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
          client_id: MANAPOND_CONFIG.clientId,
        }).toString(),
      });

      if (!res.ok) {
        await clearTokens();
        return false;
      }

      const tokens: TokenResponse = await res.json();
      await storeTokens(tokens);
      return true;
    } catch (error) {
      console.error('Token refresh error:', error);
      await clearTokens();
      return false;
    }
  }

  async function linkDeviceToUser(userInfo: UserInfo) {
    try {
      const anonymousId = await getOrCreateDeviceId();
      const accessToken = await secureStoreGet(TOKEN_KEYS.accessToken);
      
      if (!accessToken) {
        console.error('No access token available for device linking');
        return;
      }
      
      console.log('OAuth Debug - Linking device to user:', anonymousId, userInfo.sub);
      
      const res = await fetch(getLinkDeviceUrl(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ anonymousId }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Device link failed:', res.status, errorText);
        return;
      }

      const result = await res.json();
      console.log('OAuth Debug - Device linked successfully:', result);
    } catch (error) {
      console.error('Device link error:', error);
    }
  }

  async function fetchUserInfo() {
    try {
      const accessToken = await secureStoreGet(TOKEN_KEYS.accessToken);
      if (!accessToken) return;

      const res = await fetch(getUserInfoUrl(), {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!res.ok) {
        if (res.status === 401) {
          const refreshed = await refreshAccessToken();
          if (refreshed) return fetchUserInfo();
        }
        throw new Error(`User info fetch failed: ${res.status}`);
      }

      const userInfo: UserInfo = await res.json();
      setUser(userInfo);
      setIsAuthenticated(true);
      
      await linkDeviceToUser(userInfo);
    } catch (error) {
      console.error('Fetch user info error:', error);
      setIsAuthenticated(false);
    }
  }

  async function exchangeCodeWithVerifier(code: string, codeVerifier: string) {
    try {
      setIsLoading(true);
      
      // On web, use the actual browser origin for redirect_uri
      const actualRedirectUri = Platform.OS === 'web' && typeof window !== 'undefined'
        ? `${window.location.origin}/oauth-callback`
        : redirectUri;
      
      const tokenEndpoint = getTokenEndpoint();
      console.log('OAuth Debug - Exchanging code with verifier');
      console.log('OAuth Debug - Token endpoint:', tokenEndpoint);
      console.log('OAuth Debug - Redirect URI for exchange:', actualRedirectUri);
      console.log('OAuth Debug - Code verifier length:', codeVerifier.length);
      
      const body = new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: actualRedirectUri,
        client_id: MANAPOND_CONFIG.clientId,
        code_verifier: codeVerifier,
      }).toString();
      
      console.log('OAuth Debug - Request body:', body.replace(codeVerifier, '[VERIFIER]').replace(code, '[CODE]'));
      
      const res = await fetch(tokenEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      console.log('OAuth Debug - Token response status:', res.status);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('OAuth Debug - Token exchange failed:', res.status, errorText);
        throw new Error(`Token exchange failed: ${res.status} - ${errorText}`);
      }

      const tokens: TokenResponse = await res.json();
      console.log('OAuth Debug - Token exchange successful');
      await storeTokens(tokens);
      await fetchUserInfo();
      // Clear the stored verifier
      if (Platform.OS === 'web') {
        sessionStorage.removeItem('oauth_code_verifier');
      }
    } catch (error) {
      console.error('Token exchange error:', error);
      if (error instanceof Error) {
        console.error('Token exchange error message:', error.message);
        console.error('Token exchange error stack:', error.stack);
      }
      // Check if it's a network/CORS error
      if (error instanceof TypeError) {
        console.error('OAuth Debug - This may be a CORS or network error');
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function exchangeCodeForTokens(code: string) {
    if (!request?.codeVerifier) {
      console.error('Missing code verifier');
      return;
    }
    await exchangeCodeWithVerifier(code, request.codeVerifier);
  }

  useEffect(() => {
    async function checkExistingSession() {
      try {
        const accessToken = await secureStoreGet(TOKEN_KEYS.accessToken);
        const expiresAt = await secureStoreGet(TOKEN_KEYS.expiresAt);

        if (accessToken && expiresAt) {
          const isExpired = Date.now() > parseInt(expiresAt, 10);
          if (isExpired) {
            const refreshed = await refreshAccessToken();
            if (refreshed) await fetchUserInfo();
          } else {
            await fetchUserInfo();
          }
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setIsLoading(false);
      }
    }
    checkExistingSession();
  }, []);

  useEffect(() => {
    console.log('OAuth Debug - Response received:', response);
    if (response?.type === 'success') {
      console.log('OAuth Debug - Success! Code:', response.params.code);
      exchangeCodeForTokens(response.params.code);
    } else if (response?.type === 'error') {
      console.error('OAuth Debug - Error:', response.error);
    } else if (response?.type === 'dismiss') {
      console.log('OAuth Debug - Dismissed by user');
    }
  }, [response]);

  const login = useCallback(async () => {
    // Store code verifier for web (needed for redirect-based flow)
    if (Platform.OS === 'web' && request?.codeVerifier) {
      sessionStorage.setItem('oauth_code_verifier', request.codeVerifier);
      console.log('OAuth Debug - Stored code verifier in session storage');
      
      // On web, use full-page redirect instead of popup for more reliable OAuth
      if (request.url) {
        console.log('OAuth Debug - Redirecting to:', request.url);
        window.location.href = request.url;
        return;
      }
    }
    
    if (Platform.OS !== 'web') {
      await WebBrowser.warmUpAsync();
    }
    try {
      await promptAsync();
    } finally {
      if (Platform.OS !== 'web') {
        await WebBrowser.coolDownAsync();
      }
    }
  }, [promptAsync, request]);

  const logout = useCallback(async () => {
    try {
      const accessToken = await secureStoreGet(TOKEN_KEYS.accessToken);
      if (accessToken) {
        await fetch(getRevokeEndpoint(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: accessToken,
            token_type_hint: 'access_token',
            client_id: MANAPOND_CONFIG.clientId,
          }).toString(),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      await clearTokens();
    }
  }, []);

  const getAccessToken = useCallback(async (): Promise<string | null> => {
    const accessToken = await secureStoreGet(TOKEN_KEYS.accessToken);
    const expiresAt = await secureStoreGet(TOKEN_KEYS.expiresAt);

    if (!accessToken || !expiresAt) return null;

    const isExpiringSoon = Date.now() > parseInt(expiresAt, 10) - 5 * 60 * 1000;
    if (isExpiringSoon) {
      const refreshed = await refreshAccessToken();
      if (!refreshed) return null;
      return secureStoreGet(TOKEN_KEYS.accessToken);
    }

    return accessToken;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        user,
        login,
        logout,
        getAccessToken,
        isReady: !!request,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useManaPondAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useManaPondAuth must be used within a ManaPondAuthProvider');
  }
  return context;
}
