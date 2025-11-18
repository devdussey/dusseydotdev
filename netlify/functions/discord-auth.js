// Netlify Function: Discord OAuth Handler
// Exchanges Discord auth code for user data and stores in Supabase

const { Pool } = require('pg');

// Use direct PostgreSQL connection (bypasses Data API schema restrictions)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

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

    // Step 3: Store/update user in database using direct SQL
    let userId;

    try {
      const avatarUrl = discordUser.avatar
        ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
        : null;

      // Check if user exists
      const checkResult = await pool.query(
        'SELECT id FROM public.users WHERE discord_id = $1',
        [discordUser.id]
      );

      if (checkResult.rows.length > 0) {
        // Update existing user
        const updateResult = await pool.query(
          `UPDATE public.users
           SET discord_username = $1, avatar_url = $2, email = $3, updated_at = NOW()
           WHERE discord_id = $4
           RETURNING id`,
          [discordUser.username, avatarUrl, discordUser.email, discordUser.id]
        );
        userId = updateResult.rows[0].id;
      } else {
        // Create new user
        const insertResult = await pool.query(
          `INSERT INTO public.users (discord_id, discord_username, avatar_url, email, created_at, updated_at)
           VALUES ($1, $2, $3, $4, NOW(), NOW())
           RETURNING id`,
          [discordUser.id, discordUser.username, avatarUrl, discordUser.email]
        );
        userId = insertResult.rows[0].id;
      }
    } catch (dbError) {
      console.error('Database operation error:', dbError.message);
      console.error('Error code:', dbError.code);
      console.error('Error details:', dbError);
      console.error('DATABASE_URL set:', !!process.env.DATABASE_URL);
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
