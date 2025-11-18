# Wordhex - Discord Activity Project Plan

## Project Overview
**Wordhex** is a Discord Activity/SDK implementation of the SpellCast word game. Players
will compete in turn-based word-finding challenges using the Discord embedded activity
framework, with gameplay hosted on Netlify and data persisted in Supabase.

---

## 1. Game Foundation - SpellCast Rules

### Game Mechanics
- **Game Type**: Turn-based word search game
- **Players**: Up to 6 participants per game
- **Grid**: 5×5 letter grid (randomly generated)
- **Round Duration**: 30-second timer (player-activated)

### Game Modes
- **Practice** – Play solo against bots that have customizable difficulties.
- **New Game** – Members in the same Discord server may compete, or members may join a private lobby with a 4-digit pin. Highest score wins after 5 rounds, max 8 players.
- **Coming Soon** – Ranked Mode.

### Scoring System
| Point Value | Letters |
| --- | --- |
| 1 point | A, E, I, O |
| 2 points | D, G, L, N, R, S, T, U |
| 3 points | B, C, F, H, M, P, V, W, Y |
| 4 points | K |
| 5 points | J, X |
| 8 points | Q, Z |

**Special Tiles & Bonuses**
- **Double Letter (DL)**: 2× letter value
- **Triple Letter (TL)**: 3× letter value
- **Double/Triple Points**: 2×/3× word score (pink-framed letters)
- **Long Word Bonus**: +10 points for words with 6+ letters
- **Gem Tiles**: Earn gems by forming words on gem tiles (max 10 gems)

### Gem System
Players start with **3 gems** which enable special abilities:

| Ability | Cost |
| --- | --- |
| Shuffle | 1 gem |
| Swap | 3 gems |
| Hint | 4 gems |

Unused gems at end of game convert to points at a 1:1 ratio.

---

## 2. Technical Stack

### Core Requirements
- **Runtime**: Node.js 22
- **Language**: TypeScript (primary)
- **Frontend Hosting**: Netlify
- **Database**: Supabase (PostgreSQL)
- **Discord Integration**: Discord Activities SDK / Embedded App SDK

### Frontend Framework
- Modern web framework suitable for Discord embedded contexts
- Responsive design for various Discord client sizes
- Real-time WebSocket support for game state synchronization

### Backend Services
- RESTful API for game management
- WebSocket server for real-time game updates
- Authentication via Discord OAuth 2.0
- Game state management and validation

---

## 3. Discord Activities Integration

### Compliance & Guidelines
The project must follow Discord Activities requirements from <https://discord.com/developers/docs/activities/>:

**Key Requirements**
- ✅ Application properly configured in Discord Developer Portal
- ✅ Embedded App SDK implementation for iframe communication
- ✅ OAuth 2.0 authentication integration
- ✅ HTTPS enforcement for production
- ✅ Activity settings enabled in Developer Portal
- ✅ Content Security Policy (CSP) headers properly configured
- ✅ Origin validation for iframe embeds

### Implementation Points
1. **Discord Activity Manifest**: Properly configured in `vercel.json` or app configuration.
2. **SDK Initialization**: Initialize Embedded App SDK on app load.
3. **User Context**: Extract Discord user info from activity context.
4. **Real-time Updates**: Leverage Discord's activity instance for player synchronization.

---

## 4. Branding & UI/UX

### Logo & Visual Identity
- Primary logo: [User will provide logo asset]
- Color scheme: Derived from provided logo
- Design system: Consistent theming across all UI components

### UI Components to Build
- Game board (5×5 grid display)
- Word input/validation interface
- Player scoreboard
- Timer display
- Gem indicator & ability buttons
- Special tile indicators (DL, TL, multipliers)
- Game mode selection screen
- Player list & turn indicator

---

## 5. Database Schema

### Planned by User
A separate document will define:
- User/player table structure
- Game instance tables
- Game results/statistics
- Word dictionary storage
- Leaderboard data

**Note**: Database schema document pending from user.

---

## 6. Deployment Architecture

### Frontend (Netlify) <https://wordhex.dussey.dev>
- **Build Command**: `npm run build`
- **Publish Directory**: `dist/` or `build/`
- **Environment**: Production HTTPS required
- **Content Security Policy**: Configured via `netlify.toml`

### Backend (TBD)
- Platform to be determined for backend hosting and scaling.

### Database (Supabase)
- PostgreSQL database hosted on Supabase
- Real-time capabilities via `supabase-js`
- Row-level security (RLS) policies
- Connection pooling configuration

---

## 7. Logging & Error Handling

### Logging Requirements
- **Detailed Error Logs**: Capture stack traces, timestamps, user context
- **Deployment Logs**: Track all builds and deployments
- **Game Event Logs**: Log critical game events (word validation, scoring, game end)
- **API Request Logs**: Track all API calls with request/response data
- **Authentication Logs**: Log successful/failed login attempts

### Implementation Strategy
- Structured logging (JSON format for parsing)
- Log levels: DEBUG, INFO, WARN, ERROR, CRITICAL
- Centralized logging solution (Supabase logs, or external service like LogRocket)
- Client-side error boundary implementation
- Server-side error response standardization

### Error Categories to Log
1. **Client Errors**: Network issues, validation failures, UI crashes
2. **Server Errors**: Database errors, API failures, game logic failures
3. **Discord Integration**: OAuth failures, activity initialization errors
4. **Deployment Issues**: Build failures, configuration errors

### Testing Strategy
- Unit tests for game logic (word validation, scoring)
- Integration tests for API endpoints
- Discord activity integration tests
- E2E tests for complete game flows

---

## 10. Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database schema migrations applied
- [ ] Discord app configuration verified
- [ ] SSL certificates configured
- [ ] CORS headers properly set
- [ ] CSP headers configured for Discord
- [ ] Logging system operational
- [ ] Error handling implemented
- [ ] All tests passing

### Production
- [ ] Frontend deployed to Netlify
- [ ] Backend deployed (Railway/chosen platform)
- [ ] Database migrated and seeded
- [ ] DNS/domain configured
- [ ] CDN configured (if needed)
- [ ] Monitoring/alerting setup
- [ ] Backup procedures documented
- [ ] Incident response plan ready

---

## 11. Next Steps

1. **Provide Logo & Colors**: Submit logo asset and color palette.
2. **Database Schema Document**: Provide table definitions and relationships.
3. **Frontend Framework Selection**: Confirm React/Vue/Svelte choice.
4. **API Specifications**: Define all API endpoints needed.
5. **Game Logic Implementation**: Build core game logic module.
6. **Discord Integration Setup**: Configure app in Developer Portal.
7. **Testing Strategy**: Define test coverage goals and frameworks.

---

## 12. Success Criteria

- ✅ Game playable within Discord as an Activity
- ✅ Multiplayer synchronization working reliably
- ✅ All SpellCast rules correctly implemented
- ✅ Detailed error/deployment logging operational
- ✅ Responsive UI matching logo color scheme
- ✅ Database persisting player stats and games
- ✅ Secure Discord OAuth integration
- ✅ <30 second load time from Discord activity launch
- ✅ Mobile-friendly on Discord mobile clients

---

**Document Created**: 2025-11-07  
**Status**: Planning Phase  
**Next Review**: Upon logo/database schema submission
