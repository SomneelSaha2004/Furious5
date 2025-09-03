# Furious Five - Multiplayer Card Game

## Overview

Furious Five is a real-time multiplayer card game application built with a full-stack TypeScript architecture. The application implements a custom card game where players compete to achieve a hand total of less than 5 points and call the game to win. The system supports 2-5 players in local area network (LAN) environments with ephemeral, memory-based game sessions.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### **Monorepo Structure**
The application follows a monorepo pattern with clear separation of concerns:
- **Client**: React-based frontend application with Vite bundling
- **Server**: Express.js backend with WebSocket support via Socket.IO
- **Shared**: Common TypeScript types, game engine logic, and validation schemas

### **Frontend Architecture**
- **Framework**: React 18 with TypeScript in strict mode
- **Styling**: Tailwind CSS with shadcn/ui component library for consistent design
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: React hooks with custom game socket hook for WebSocket communication
- **Build System**: Vite for fast development and optimized production builds

The frontend implements a component-based architecture with dedicated views for lobby, game table, and settlement phases. Real-time game state synchronization occurs through WebSocket connections.

### **Backend Architecture**
- **Runtime**: Node.js 20+ with Express.js web framework
- **Real-time Communication**: Socket.IO for WebSocket-based multiplayer functionality
- **Game State**: In-memory storage with automatic cleanup of inactive rooms
- **Game Engine**: Pure functional game logic separated from server concerns for testability

The server maintains authoritative game state and validates all player actions through the shared game engine. Room-based multiplayer sessions support up to 5 concurrent players with automatic reconnection handling.

### **Data Architecture**
- **Storage**: Memory-based storage (no database) for ephemeral game sessions
- **Validation**: Zod schemas for runtime type validation across client-server boundaries
- **Game Logic**: Deterministic game engine with immutable state transitions
- **Card System**: Standard 52-card deck with rank-based point scoring (Ace=1, Face cards=11-13)

### **Development & Build System**
- **Package Management**: npm with workspace support for monorepo dependencies
- **TypeScript**: Strict mode configuration with path mapping for clean imports
- **Development**: Hot module replacement via Vite with automatic server restarts
- **Production**: Static asset serving with optimized bundling and tree-shaking

The build system produces a single deployable artifact with the Express server serving both API endpoints and static frontend assets.

## External Dependencies

### **Core Runtime Dependencies**
- **@neondatabase/serverless**: PostgreSQL database driver (prepared for future persistence)
- **drizzle-orm**: Type-safe ORM with PostgreSQL dialect configuration
- **express**: Web application framework for API and static serving
- **socket.io**: Real-time bidirectional communication library

### **Frontend UI Dependencies**
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **tailwindcss**: Utility-first CSS framework
- **lucide-react**: Icon library for consistent visual elements

### **Development & Build Tools**
- **vite**: Frontend build tool and development server
- **typescript**: Static type checking and compilation
- **drizzle-kit**: Database schema management and migrations
- **postcss**: CSS processing with Tailwind integration

### **Validation & Utilities**
- **zod**: Runtime type validation and schema definition
- **class-variance-authority**: Type-safe CSS class composition
- **date-fns**: Date manipulation and formatting utilities

The application is designed for local deployment with minimal external service dependencies. Database integration is configured but not actively used, allowing for future persistence features without architectural changes.