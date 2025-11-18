// Netlify Function: Discord OAuth Handler
// Exchanges Discord auth code for user data and stores in Supabase

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase with service role key (has full database access)
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Discord OAuth credentials
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://dussey.dev/.netlify/functions/discord-auth';

exports.handler = async (event) => {
  try {
    // Get authorization code from Discord
    const { code, state, error } = event.queryStringParameters || {};

    // Handle Discord errors
    if (error) {
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=${error}`
        }
      };
    }

    if (!code) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing authorization code' })
      };
    }

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
      })
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('Discord token exchange failed:', errorData);
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=token_exchange_failed`
        }
      };
    }

    const { access_token } = await tokenResponse.json();

    // Step 2: Get user data from Discord
    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: {
        Authorization: `Bearer ${access_token}`
      }
    });

    if (!userResponse.ok) {
      console.error('Failed to get Discord user');
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=user_fetch_failed`
        }
      };
    }

    const discordUser = await userResponse.json();

    // Step 3: Store/update user in Supabase
    let userId;

    try {
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      // Check if user exists
      const { data: existingUser, error: selectError } = await supabase
        .from('users')
        .select('id')
        .eq('discord_id', discordUser.id)
        .maybeSingle();

      if (existingUser) {
        // Update existing user
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
      } else {
        // Create new user
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
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError.message);
      console.error('Full error:', dbError);
      return {
        statusCode: 302,
        headers: {
          Location: `/wordhex/login.html?error=database_error`
        }
      };
    }

    // Step 4: Create session token (JWT)
    const sessionToken = Buffer.from(JSON.stringify({
      userId: userId,
      discordId: discordUser.id,
      username: discordUser.username,
      avatar: discordUser.avatar,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60) // 7 days
    })).toString('base64');

    // Step 5: Redirect to game with session
    return {
      statusCode: 302,
      headers: {
        Location: `/wordhex/?session=${sessionToken}&user=${discordUser.username}`
      }
    };

  } catch (error) {
    console.error('OAuth handler error:', error);
    return {
      statusCode: 302,
      headers: {
        Location: `/wordhex/login.html?error=internal_error`
      }
    };
  }
};
