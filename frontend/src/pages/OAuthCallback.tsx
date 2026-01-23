import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import api from '@/services/api';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';

export default function OAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToken, setUser } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const provider = window.location.pathname.includes('github') ? 'github' : 'google';
      const errorParam = searchParams.get('error');

      if (errorParam) {
        setError(`OAuth error: ${errorParam}`);
        setLoading(false);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      if (!code) {
        setError('No authorization code received');
        setLoading(false);
        setTimeout(() => navigate('/settings'), 3000);
        return;
      }

      try {
        // Check if user is already logged in using auth store
        const { token: storeToken, user: storeUser } = useAuthStore.getState();
        const parsedToken = storeToken;

        console.log('OAuth callback - checking auth state:', {
          hasToken: !!parsedToken,
          tokenLength: parsedToken?.length,
          hasUser: !!storeUser,
          provider,
        });

        if (parsedToken && storeUser) {
          // User is logged in, connect account
          // Create a new axios instance with the token to ensure it's set
          const apiWithToken = axios.create({
            baseURL: '/api',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${parsedToken}`,
            },
          });
          
          const endpoint = provider === 'github' ? '/github/connect' : '/drive/connect';
          const redirectUri = `${window.location.origin}/auth/${provider}/callback`;
          
          console.log('Sending OAuth connect request:', {
            endpoint,
            provider,
            hasCode: !!code,
            redirectUri,
          });
          
          const response = await apiWithToken.post(endpoint, { code, redirect_uri: redirectUri });
          
          if (response.data.message) {
            toast.success(response.data.message);
          }
          
          // Update user data in store
          const userResponse = await apiWithToken.get('/users/me');
          setUser(userResponse.data.data.user);
          
          // Also update the main api instance
          api.defaults.headers.common['Authorization'] = `Bearer ${parsedToken}`;
          
          toast.success(`${provider === 'github' ? 'GitHub' : 'Google'} account connected successfully!`);
          navigate('/settings');
        } else {
          // User is not logged in, this is login flow
          try {
            const response = await api.post(`/auth/${provider}/callback`, { code });
            
            if (response.data.success && response.data.data) {
              const { user, token } = response.data.data;
              
              if (token && user) {
                setToken(token);
                setUser(user);
                toast.success('Logged in successfully!');
                navigate('/dashboard');
              } else {
                throw new Error('Invalid response from server');
              }
            } else {
              throw new Error(response.data.error?.message || 'Login failed');
            }
          } catch (error: any) {
            console.error('OAuth login error:', error);
            const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to login';
            toast.error(errorMessage);
            setTimeout(() => navigate('/login'), 2000);
          }
        }
      } catch (error: any) {
        console.error('OAuth callback error:', error);
        const errorMessage = error.response?.data?.error?.message || error.message || 'Failed to connect account';
        console.error('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
        });
        setError(errorMessage);
        
        // If it's a 401 error, check if it's from our backend (JWT expired) or GitHub
        if (error.response?.status === 401) {
          const errorMsg = error.response?.data?.error?.message || error.message || '';
          // If it's a GitHub-related error, don't logout - just show error
          if (errorMsg.includes('GitHub') || errorMsg.includes('OAuth')) {
            toast.error('Failed to connect GitHub account. Please try again.');
            setTimeout(() => navigate('/settings'), 3000);
          } else {
            // JWT token expired - redirect to login
            toast.error('Your session has expired. Please log in again.');
            setTimeout(() => {
              useAuthStore.getState().logout();
              navigate('/login');
            }, 2000);
          }
        } else {
          setTimeout(() => navigate('/settings'), 3000);
        }
      } finally {
        setLoading(false);
      }
    };

    handleCallback();
  }, [searchParams, navigate, setToken, setUser]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Connecting your account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center max-w-md">
          <div className="text-red-600 dark:text-red-400 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Connection Failed</h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-500">Redirecting to settings...</p>
        </div>
      </div>
    );
  }

  return null;
}

