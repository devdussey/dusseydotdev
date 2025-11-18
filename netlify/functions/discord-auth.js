import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { env } from '@netlify/functions';

const REDIRECT_FALLBACK = 'https://dussey.dev/.netlify/functions/discord-auth';
const REQUEST_BASE_URL = 'https://dussey.dev';
const DISCORD_TOKEN_URL = 'https://discord.com/api/v10/oauth2/token';
const DISCORD_USER_URL = 'https://discord.com/api/v10/users/@me';

const configErrorResponse = {
  statusCode: 500,
  body: JSON.stringify({ error: 'Server configuration error' })
};

const redirectToLogin = (errorCode) => ({
  statusCode: 302,
  headers: {
    Location: `/wordhex/login.html?error=${errorCode}`
  }
});

const safeParseJson = async (response) => {
  try {
    return await response.json();
  } catch (parseError) {
    console.error('Unable to parse JSON response:', parseError);
    return null;
  }
};

export default async function handler(request) {
  const supabaseUrl = env.get('VITE_SUPABASE_URL');
  const supabaseServiceKey = env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase env vars');
    return configErrorResponse;
  }

  const discordClientId = env.get('DISCORD_CLIENT_ID');
  const discordClientSecret = env.get('DISCORD_CLIENT_SECRET');
  const redirectUri = env.get('DISCORD_REDIRECT_URI') ?? REDIRECT_FALLBACK;
  const sessionSecret = env.get('SUPABASE_JWT_SECRET');

  if (!discordClientId || !discordClientSecret) {
    console.error('Missing Discord OAuth credentials');
    return configErrorResponse;
  }

  if (!redirectUri) {
    console.error('Missing Discord redirect URI');
    return configErrorResponse;
  }

  if (!sessionSecret) {
    console.error('Missing session signing secret');
    return configErrorResponse;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      db: {
        schema: 'api'
      }
    });

    console.log('OAuth callback received');
    const requestUrl = new URL(request.url, REQUEST_BASE_URL);
    const code = requestUrl.searchParams.get('code');
    const state = requestUrl.searchParams.get('state');
    const error = requestUrl.searchParams.get('error');

    if (error) {
      console.log('Discord error:', error, 'state=', state);
      return redirectToLogin(error);
    }

    if (!code) {
      console.error('Missing authorization code');
      return redirectToLogin('no_code');
    }

    console.log('Exchanging code for token...');
    const tokenResponse = await fetch(DISCORD_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: discordClientId,
        client_secret: discordClientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri
      }).toString()
    });

    const tokenData = await safeParseJson(tokenResponse);

    if (!tokenResponse.ok) {
      console.error('Discord token exchange failed:', tokenData ?? { status: tokenResponse.status });
      return redirectToLogin('token_failed');
    }

    if (!tokenData || !tokenData.access_token) {
      console.error('No access token in Discord response', tokenData);
      return redirectToLogin('token_failed');
    }

    const accessToken = tokenData.access_token;
    console.log('Got access token, fetching user...');

    const userResponse = await fetch(DISCORD_USER_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const discordUser = await safeParseJson(userResponse);

    if (!userResponse.ok || !discordUser?.id) {
      console.error('Failed to get Discord user:', userResponse.status, discordUser);
      return redirectToLogin('user_failed');
    }

    console.log('Got Discord user:', discordUser.id);

    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    console.log('Checking if user exists...');

    const { data: existingUser, error: selectError } = await supabase
      .from('users')
      .select('id')
      .eq('discord_id', discordUser.id)
      .maybeSingle();

    let userId;

    if (selectError && selectError.code !== 'PGRST116') {
      throw selectError;
    }

    if (existingUser) {
      console.log('Updating existing user...');
      const { data, error } = await supabase
        .from('users')
        .update({
          discord_username: discordUser.username,
          avatar_url: avatarUrl,
          email: discordUser.email,
          updated_at: new Date().toISOString()
        })
        .eq('discord_id', discordUser.id)
        .select('id')
        .single();

      if (error) throw error;
      userId = data.id;
      console.log('User updated');
    } else {
      console.log('Creating new user...');
      const { data, error } = await supabase
        .from('users')
        .insert([{
          discord_id: discordUser.id,
          discord_username: discordUser.username,
          avatar_url: avatarUrl,
          email: discordUser.email
        }])
        .select('id')
        .single();

      if (error) throw error;
      userId = data.id;
      console.log('User created');
    }

    const sessionToken = jwt.sign({
      userId,
      discordId: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar
    }, sessionSecret, { expiresIn: '7d' });

    console.log('Login successful!');

    return {
      statusCode: 302,
      headers: {
        Location: `/wordhex/?session=${encodeURIComponent(sessionToken)}&user=${encodeURIComponent(discordUser.username)}`
      }
    };
  } catch (error) {
    console.error('OAuth handler error:', error?.message ?? error);
    console.error('Full error:', error);
    return redirectToLogin('server_error');
  }
}
