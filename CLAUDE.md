# Air Hockey

A multiplayer Air Hockey game for family fun with arcade-style neon graphics.

## Tech Stack

- **Frontend**: HTML5 Canvas, CSS3 (neon effects)
- **Networking**: PeerJS (WebRTC) for peer-to-peer multiplayer
- **Audio**: Web Audio API with procedural sound generation
- **Hosting**: GitHub Pages ready
- **Mobile**: PWA (Progressive Web App) with home screen install

## Project Structure

```
/AirHockey
├── index.html          # Entry point with all screen layouts
├── manifest.json       # PWA manifest
├── sw.js               # Service worker for offline/caching
├── css/
│   └── style.css       # Arcade styling with neon glow effects
├── js/
│   ├── game.js         # Game loop, physics, rendering
│   ├── network.js      # PeerJS connection management
│   ├── audio.js        # Procedural sound effects
│   └── ui.js           # Screen transitions and UI handlers
└── assets/
    └── images/
        └── icon.svg    # App icon
```

## Key Files

- [js/game.js](js/game.js) - Core game engine: canvas rendering, physics (friction, collision detection), touch/mouse input
- [js/network.js](js/network.js) - WebRTC networking: room codes, host/guest roles, state synchronization
- [js/audio.js](js/audio.js) - Sound effects using Web Audio API oscillators and noise buffers
- [js/ui.js](js/ui.js) - UI management: menu screens, score display, game over

## How It Works

### Multiplayer Architecture
- **Host-authoritative**: Host runs physics, sends puck state to guest at ~30fps
- **Guest**: Sends paddle position to host, receives mirrored game state
- **Room codes**: 4-digit codes for easy sharing

### Physics
- Simple vector-based physics (no library)
- Puck has velocity, friction (~0.995/frame), max speed cap
- Wall/paddle collision with angle reflection
- Paddle velocity affects puck on impact

### Visual Style
- Dark purple background with neon glow effects
- Cyan paddle (player) vs Magenta paddle (opponent)
- Yellow puck with trailing glow
- Score: First to 11 wins

## Development

### Local Testing
```bash
# Serve with any static server
npx serve .
# or
python -m http.server 8000
```

Open in two browser windows/tabs to test multiplayer.

### Deploying to GitHub Pages
1. Push to GitHub repository
2. Go to Settings > Pages
3. Set source to main branch, root folder
4. Access at `https://username.github.io/airhockey`

## Game Controls

- **Desktop**: Mouse movement controls paddle
- **Mobile**: Touch and drag to control paddle
- Paddle is constrained to your half of the table

## Portrait Orientation

The game is designed for portrait mode on all devices for a consistent experience. Landscape mode shows a rotation prompt.
