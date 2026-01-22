import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { createError } from '../middleware/errorHandler.js';

const prisma = new PrismaClient();

export class GitHubService {
  private clientId = process.env.GITHUB_CLIENT_ID;
  private clientSecret = process.env.GITHUB_CLIENT_SECRET;

  async connectAccount(userId: string, code: string, redirectUri?: string): Promise<any> {
    if (!this.clientId || !this.clientSecret) {
      throw createError('GitHub OAuth not configured. Please set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET environment variables.', 500);
    }

    // Default redirect URI if not provided
    const defaultRedirectUri = process.env.GITHUB_REDIRECT_URI || 'http://localhost:5173/auth/github/callback';
    const finalRedirectUri = redirectUri || defaultRedirectUri;

    // Exchange code for access token
    // GitHub OAuth endpoint expects form-urlencoded data, not JSON
    let tokenResponse;
    try {
      const params = new URLSearchParams();
      params.append('client_id', this.clientId!);
      params.append('client_secret', this.clientSecret!);
      params.append('code', code);
      params.append('redirect_uri', finalRedirectUri);

      tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        params.toString(),
        {
          headers: { 
            Accept: 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    } catch (error: any) {
      console.error('GitHub token exchange error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        message: error.message,
        clientId: this.clientId ? `${this.clientId.substring(0, 5)}...` : 'missing',
        redirectUri: finalRedirectUri,
      });
      
      if (error.response?.status === 401) {
        throw createError('Invalid GitHub authorization code. The code may have expired or already been used. Please try connecting again.', 400);
      }
      if (error.response?.data?.error) {
        const errorMsg = error.response.data.error;
        const errorDesc = error.response.data.error_description || '';
        throw createError(`GitHub OAuth error: ${errorMsg} - ${errorDesc}. Please check your Client ID and Secret in .env file.`, 400);
      }
      throw createError(`Failed to exchange code for access token: ${error.message}`, 500);
    }

    const { access_token, error: tokenError, error_description, scope } = tokenResponse.data;

    console.log('GitHub token exchange response:', {
      hasToken: !!access_token,
      tokenLength: access_token?.length,
      scope,
      error: tokenError,
    });

    if (tokenError) {
      console.error('GitHub token exchange error:', tokenError, error_description);
      throw createError(`GitHub OAuth error: ${tokenError} - ${error_description || ''}`, 400);
    }

    if (!access_token) {
      console.error('No access token in response:', tokenResponse.data);
      throw createError('Failed to get access token from GitHub', 500);
    }

    console.log('Access token received, attempting to get user info immediately...');

    // Get user info - Modern GitHub OAuth tokens (gho_*) MUST use Bearer format
    // Use token immediately after exchange (no delay needed)
    let userResponse;
    try {
      // Modern GitHub OAuth tokens (gho_*) require Bearer format
      // Use token immediately - GitHub tokens are ready right after exchange
      userResponse = await axios.get('https://api.github.com/user', {
        headers: { 
          Authorization: `Bearer ${access_token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'CodeCompute-Hub',
        },
        timeout: 15000, // 15 second timeout
      });
      
      console.log('Successfully got user info with Bearer token');
    } catch (error: any) {
      // If axios throws an error (network, timeout, etc.)
      if (!error.response) {
        console.error('Network/timeout error:', error.message);
        throw createError(`Failed to connect to GitHub API: ${error.message}. Please check your internet connection and try again.`, 500);
      }
      
      // If GitHub returns an error response
      const status = error.response?.status;
      const errorData = error.response?.data;
      
      console.error('GitHub API error:', {
        status,
        statusText: error.response?.statusText,
        data: errorData,
        message: error.message,
        tokenType: access_token?.substring(0, 4),
        tokenLength: access_token?.length,
        tokenPreview: access_token ? `${access_token.substring(0, 15)}...` : 'null',
      });
      
      // Provide specific error messages based on status
      if (status === 401) {
        // Check if it's a token issue or authentication issue
        if (errorData?.message === 'Bad credentials') {
          throw createError(
            `GitHub authentication failed: Bad credentials.\n\n` +
            `Possible causes:\n` +
            `1. OAuth code expired (codes expire in 10 minutes) - Try connecting again\n` +
            `2. Client ID or Secret in .env file is incorrect\n` +
            `3. Redirect URI doesn't match GitHub OAuth App settings exactly\n` +
            `4. OAuth App might be suspended\n\n` +
            `Please verify:\n` +
            `- .env file has correct GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET\n` +
            `- GitHub OAuth App callback URL is: ${finalRedirectUri}\n` +
            `- Try disconnecting and reconnecting with a fresh authorization`,
            401
          );
        }
        throw createError(`GitHub authentication failed: ${errorData?.message || 'Unauthorized'}. Please check your OAuth App settings.`, 401);
      }
      
      if (status === 403) {
        throw createError(`GitHub API access forbidden: ${errorData?.message || 'Forbidden'}. Your OAuth App may not have the required permissions.`, 403);
      }
      
      throw createError(`Failed to get user info from GitHub: ${errorData?.message || error.message}`, status || 500);
    }

    // Make sure we have userResponse before proceeding
    if (!userResponse || !userResponse.data) {
      throw createError('Failed to get user info from GitHub', 500);
    }

    const { login, email: primaryEmail } = userResponse.data;

    // If email is not in user endpoint, try to get from emails endpoint
    let email = primaryEmail;
    if (!email) {
      try {
        const emailsResponse = await axios.get('https://api.github.com/user/emails', {
          headers: { 
            Authorization: `Bearer ${access_token}`,
            Accept: 'application/vnd.github.v3+json',
            'User-Agent': 'CodeCompute-Hub',
          },
        });
        const emails = emailsResponse.data;
        const primaryEmailObj = emails.find((e: any) => e.primary);
        email = primaryEmailObj?.email || emails[0]?.email;
      } catch (error) {
        // If we can't get email, use login as fallback
        email = `${login}@users.noreply.github.com`;
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        githubToken: access_token,
        githubUsername: login,
      },
    });

    return {
      username: login,
      email,
    };
  }

  async createRepository(
    token: string,
    name: string,
    description: string,
    isPrivate: boolean
  ): Promise<any> {
    const response = await axios.post(
      'https://api.github.com/user/repos',
      {
        name,
        description,
        private: isPrivate,
        auto_init: true,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'CodeCompute-Hub',
        },
      }
    );

    return response.data;
  }

  async syncProject(
    token: string,
    repoName: string,
    files: any[],
    branch: string = 'main'
  ): Promise<any> {
    // Get repository info
    const username = await this.getUsernameFromToken(token);
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${username}/${repoName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const repo = repoResponse.data;

    // Get current tree
    const refResponse = await axios.get(
      `https://api.github.com/repos/${repo.full_name}/git/ref/heads/${branch}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const sha = refResponse.data.object.sha;

    // Create blobs for all files
    const blobs = await Promise.all(
      files
        .filter(f => !f.isDirectory)
        .map(async (file) => {
          const blobResponse = await axios.post(
            `https://api.github.com/repos/${repo.full_name}/git/blobs`,
            {
              content: Buffer.from(file.content).toString('base64'),
              encoding: 'base64',
            },
            {
              headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
              },
            }
          );
          return {
            path: file.path,
            mode: '100644',
            type: 'blob',
            sha: blobResponse.data.sha,
          };
        })
    );

    // Create tree
    const treeResponse = await axios.post(
      `https://api.github.com/repos/${repo.full_name}/git/trees`,
      {
        base_tree: sha,
        tree: blobs,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    // Create commit
    const commitResponse = await axios.post(
      `https://api.github.com/repos/${repo.full_name}/git/commits`,
      {
        message: 'Sync from collaborative IDE',
        tree: treeResponse.data.sha,
        parents: [sha],
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    // Update reference
    await axios.patch(
      `https://api.github.com/repos/${repo.full_name}/git/refs/heads/${branch}`,
      {
        sha: commitResponse.data.sha,
      },
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    return {
      commit: commitResponse.data,
      filesCount: blobs.length,
    };
  }

  async pushToBranch(
    token: string,
    repoName: string,
    branch: string,
    files: any[],
    commitMessage: string,
    userId: string
  ): Promise<any> {
    const username = await this.getUsernameFromToken(token);

    // Get repository
    const repoResponse = await axios.get(
      `https://api.github.com/repos/${username}/${repoName}`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    const repo = repoResponse.data;

    // Check if branch exists, create if not
    try {
      await axios.get(
        `https://api.github.com/repos/${repo.full_name}/git/ref/heads/${branch}`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    } catch {
      // Branch doesn't exist, create it from main
      const mainRef = await axios.get(
        `https://api.github.com/repos/${repo.full_name}/git/ref/heads/main`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      await axios.post(
        `https://api.github.com/repos/${repo.full_name}/git/refs`,
        {
          ref: `refs/heads/${branch}`,
          sha: mainRef.data.object.sha,
        },
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );
    }

    // Sync project (reuse sync logic)
    return this.syncProject(token, repoName, files, branch);
  }

  async getBranches(token: string, repoName: string): Promise<any[]> {
    const username = await this.getUsernameFromToken(token);

    const response = await axios.get(
      `https://api.github.com/repos/${username}/${repoName}/branches`,
      {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    return response.data;
  }

  private async getUsernameFromToken(token: string): Promise<string> {
    const userResponse = await axios.get('https://api.github.com/user', {
      headers: { Authorization: `token ${token}` },
    });
    return userResponse.data.login;
  }
}

