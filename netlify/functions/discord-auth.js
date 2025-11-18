// Netlify Function: Discord OAuth Handler
// Exchanges Discord auth code for user data and stores in Supabase

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase env vars');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'api'
  }
});

// Discord OAuth credentials
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = 'https://dussey.dev/.netlify/functions/discord-auth';

exports.handler = async (event) => {
  try {
    console.log('OAuth callback received');

    // Get authorization code from Discord
    const { code, state, error } = event.queryStringParameters || {};

    // Handle Discord errors
    if (error) {
      console.log('Discord error:', error);
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=${error}`
        }
      };
    }

    if (!code) {
      console.error('Missing authorization code');
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=no_code`
        }
      };
    }

    console.log('Exchanging code for token...');

    // Step 1: Exchange code for access token
    const tokenResponse = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: REDIRECT_URI
      }).toString()
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Discord token exchange failed:', errorData);
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=token_failed`
        }
      };
    }

    const tokenData = await tokenResponse.json();
    const access_token = tokenData.access_token;

    console.log('Got access token, fetching user...');

    // Step 2: Get user data from Discord
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to get Discord user:', userResponse.status);
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=user_failed`
        }
      };
    }

    const discordUser = await userResponse.json();
    console.log('Got Discord user:', discordUser.id);

    // Step 3: Store/update user in Supabase
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

    // Step 4: Create session token
    const sessionToken = Buffer.from(JSON.stringify({
      userId: userId,
      discordId: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60)
    })).toString('base64');

    console.log('Login successful!');

    // Step 5: Redirect to game with session
    return {
      statusCode: 302,
      headers: {
        Location: `/wordhex/?session=${sessionToken}&user=${encodeURIComponent(discordUser.username)}`
      }
    };

  } catch (error) {
    console.error('OAuth handler error:', error.message);
    console.error('Full error:', error);
    return {
      statusCode: 302,
      headers: {
        Location: `/wordhex/login.html?error=server_error`
      }
    };
  }
};
