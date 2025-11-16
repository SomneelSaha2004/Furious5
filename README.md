# Furious Five 🃏

A real-time multiplayer card game built with TypeScript, React, and Socket.IO. Race to get your hand total under 5 points and call the game to win!

## 🎮 Game Overview

Furious Five is a fast-paced card game for 2-5 players where strategy meets quick thinking. Players compete to achieve the lowest hand total while managing risk and timing their calls perfectly.

### How to Play

**Objective:** Get your hand total to 5 points or less, then call the game to win.

**Setup:**
- Each player starts with 5 cards
- Cards are worth their face value (Ace = 1, Face cards = 11-13)
- Players take turns in sequence

**Turn Actions:**
1. **Draw** a card from the deck OR pick up from the graveyard
2. **Drop** cards using these combinations:
   - **Single:** Any individual card
   - **Pair:** Two cards of the same rank
   - **Trips:** Three cards of the same rank  
   - **Quads:** Four cards of the same rank
   - **Straight:** 3+ consecutive cards (A-2-3, 2-3-4, etc.)

**Calling the Game:**
- When your hand total is ≤ 5 points, you can call the game
- All other players get one final turn
- Lowest total wins and takes the pot
- Tied lowest scores split the winnings

**Special Features:**
- 30-second turn timer with auto-play if time expires
- Real-time multiplayer with instant updates
- Dark/light theme support
- Automatic game state management

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd furious-five
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   - Navigate to `http://localhost:5000`
   - Create a room and share the room code with friends
   - Start playing!

## 🏗️ Technical Architecture

### Frontend
- **React 18** with TypeScript for type safety
- **Tailwind CSS** + **shadcn/ui** for modern, accessible UI components
- **Wouter** for lightweight client-side routing
- **Socket.IO Client** for real-time game communication

### Backend
- **Express.js** server with TypeScript
- **Socket.IO** for WebSocket-based multiplayer functionality
- **In-memory storage** for fast, ephemeral game sessions
- **Zod** for runtime validation and type safety

### Game Engine
- Pure functional game logic separated from server concerns
- Deterministic state transitions for reliable multiplayer experience
- Room-based sessions supporting 2-5 concurrent players
- Automatic cleanup of inactive games

## 📁 Project Structure

```
furious-five/
├── client/src/           # React frontend application
│   ├── components/       # Reusable UI components
│   ├── pages/           # Route components
│   └── hooks/           # Custom React hooks
├── server/              # Express.js backend
│   ├── index.ts         # Server entry point
│   ├── routes.ts        # API route definitions
│   └── storage.ts       # In-memory data management
├── shared/              # Common code between client/server
│   ├── game-engine.ts   # Core game logic
│   ├── game-types.ts    # TypeScript type definitions
│   └── schema.ts        # Data validation schemas
└── README.md           # This file
```

## 🎯 Key Features

- **Real-time Multiplayer:** Instant game state synchronization across all players
- **Smart Timer System:** 30-second turns with automatic timeout handling
- **Flexible Card Combinations:** Multiple ways to play cards strategically  
- **Room-based Games:** Private lobbies with unique room codes
- **Responsive Design:** Works seamlessly on desktop and mobile devices
- **Theme Support:** Beautiful dark and light mode options
- **Automatic Reconnection:** Handles network interruptions gracefully

## 🎲 Game Strategy Tips

1. **Early Game:** Focus on collecting pairs and trips for efficient hand reduction
2. **Mid Game:** Watch other players' discards to anticipate their strategies
3. **End Game:** Time your call carefully - too early and others might beat your score
4. **Risk Management:** Sometimes it's better to drop high cards even if you can't make combinations
5. **Observation:** Pay attention to what cards others pick from the graveyard

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start development server with hot reloading
- `npm run build` - Produce production bundles for the client and server
- `npm run start` - Run the bundled server (serves both API and client)

## 🛳️ Deployment

1. Install dependencies in a clean environment: `npm install`
2. Copy `.env.example` to `.env` and adjust values as needed (only `PORT` is required by default)
3. Build the client and server bundles: `npm run build`
4. Launch the server: `npm run start`

The Express server listens on the port defined by the `PORT` environment variable (defaults to `5000`) and serves the static React build alongside the WebSocket endpoint at `/ws`. Place the process behind your host's reverse proxy, forward WebSocket traffic, and point your custom domain at the host-provided load balancer. Ensure persistent storage or graceful restarts if you expect to keep rooms active across deployments—the default in-memory store is cleared on restart.

### Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

---

**Ready to play?** Start a game and see if you can master the art of Furious Five! 🃏✨