# Stonefire - Prehistoric Strategy Card Game!

### Click to play: [![Stonefire](https://img.shields.io/badge/StoneFire-DEMO!-green)](https://stonefire.malinowskiconsulting.com/)

A browser-based trading card game with a prehistoric theme, inspired by Hearthstone's streamlined digital mechanics. Single-player vs AI opponent, built with 100% vanilla JavaScript.

## Play the Game

Open `index.html` in any modern browser to start playing. No build step or server required.

## Game Rules

### Objective
Reduce your opponent's health from 30 to 0.

### Turn Structure
1. **Start of Turn**: Gain a mana crystal (max 10), refresh all mana, draw a card
2. **Main Phase**: Play cards from hand, attack with creatures
3. **End Turn**: Click "End Turn" button or press Space/Enter

### Mana System
- Start with 0 mana crystals
- Gain 1 mana crystal each turn (maximum 10)
- All mana refreshes at the start of your turn
- Cards cost mana to play (shown in blue circle)

### Combat
- Creatures can attack after one turn (summoning sickness)
- Click a creature to select it, then click an enemy creature or hero to attack
- Creatures deal damage equal to their attack and take damage back
- Guard creatures must be attacked first

### Card Types
- **Creatures**: Have Attack/Health stats, remain on board
- **Spells**: One-time effects, then discarded

### Keywords
| Keyword | Effect |
|---------|--------|
| **Charge** | Can attack immediately when played |
| **Guard** | Enemies must attack this creature first |
| **Venomous** | Destroys any creature this damages |
| **Armored X** | Reduces incoming damage by X |

### Triggered Abilities
| Ability | When It Triggers |
|---------|------------------|
| **Battlecry** | When the creature is played from hand |
| **Extinct** | When the creature dies |
| **On Turn Start/End** | At the start/end of a turn |
| **On Draw** | When a card is drawn |
| **On Summon** | When a creature enters the board |
| **On Damage** | When this creature takes damage |

## Controls

- **Left Click**: Select cards, play cards, attack
- **Right Click / Escape**: Cancel selection
- **Space / Enter**: End turn
- **1-9**: Quick-play card from hand by position

## Factions

| Faction | Theme | Playstyle | Color |
|---------|-------|-----------|-------|
| **Triassic** | Early dinosaurs | Evolve mechanics, growing threats | Green |
| **Jurassic** | Apex predators | Big creatures, aggression | Red |
| **Cretaceous** | Diverse life | Card draw, utility, flexibility | Blue |
| **Primordial** | Ancient sea life | Control, removal, defensive | Purple |
| **Ice Age** | Prehistoric mammals | Armor, resilience, comeback | White |

## Project Structure

```
stonefire/
├── index.html              # Game entry point
├── profile.html            # User profile page
├── about.html, rules.html  # Info pages
├── privacy.html, terms.html# Legal pages
├── offline.html            # PWA offline fallback
├── sw.js                   # Service worker for offline support
├── css/
│   ├── main.css           # Base styles, CSS variables
│   ├── board.css          # Game board layout
│   ├── cards.css          # Card component styles
│   ├── animations.css     # Animations and effects
│   ├── profile.css        # Profile page styles
│   └── wizard.css         # Game setup wizard styles
├── js/
│   ├── main.js            # Entry point, initialization
│   ├── game/
│   │   ├── state.js       # State management (Redux-like)
│   │   ├── engine.js      # Game rules, turn flow
│   │   ├── combat.js      # Combat resolution
│   │   └── effects.js     # Ability/effect processing
│   ├── ai/
│   │   ├── opponent.js    # AI decision making
│   │   ├── evaluation.js  # Board state evaluation
│   │   └── personality.js # Faction-specific AI behaviors & taunts
│   ├── ui/
│   │   ├── renderer.js    # State to DOM rendering
│   │   ├── cards.js       # Card components
│   │   ├── board.js       # Board rendering
│   │   ├── input.js       # Click/input handling
│   │   ├── animations.js  # Animation system
│   │   ├── wizard.js      # Game setup wizard
│   │   ├── chatBubble.js  # AI taunt speech bubbles
│   │   └── authModal.js   # Login/signup modal
│   ├── services/
│   │   ├── auth.js        # Authentication (anonymous, OAuth, email)
│   │   ├── profile.js     # User profile & preferences
│   │   ├── progress.js    # Game stats tracking
│   │   ├── saveGame.js    # Save/load game state
│   │   ├── supabase.js    # Supabase client
│   │   ├── cloudflare.js  # Cloudflare integration
│   │   └── syncManager.js # Cross-device sync queue
│   └── data/
│       └── cards.js       # Card definitions
├── tests/                  # Playwright E2E tests
└── assets/                # Art and icons (placeholder)
```

## Technical Details

- **No Dependencies**: 100% vanilla JavaScript, CSS, and HTML
- **State Management**: Redux-like pattern with immutable updates
- **Event System**: Pub/sub pattern for game events
- **Rendering**: State-driven DOM updates
- **AI**: Heuristic-based decision making with faction-specific personalities
- **PWA**: Service worker for offline play
- **Cloud Sync**: Optional Supabase backend for cross-device progress

## Features

- **Game Setup Wizard**: Mobile-friendly step-by-step faction selection
- **AI Personalities**: Each faction has unique aggression levels and playstyle
- **AI Taunts**: Faction-themed speech bubbles during gameplay
- **Save/Load**: Auto-save with cloud sync for logged-in users
- **Progress Tracking**: Win/loss stats, streaks, per-faction statistics
- **User Profiles**: Display name, preferences, cloud-synced settings
- **Authentication**: Anonymous play, or sign in with GitHub/Google/email

## TODO
- Replace placeholder emoji's with custom card art
- Achievements
- Campaign/story mode
- Card collection/unlocking, Deck builder UI + Custom Decks
- Sound effects
- Online multiplayer (WebSocket server)?? Maybe

## Browser Support

Works in all modern browsers (Chrome, Firefox, Safari, Edge).

## LLM & Agent Guidance

- Short pointer: `llm.txt` (root) references `docs/llm-full.txt` for canonical LLM extraction and citation rules. ✅
- Contact for dataset/export requests: `nathan@malinowskiconsulting.com`.

## License

[GNU GPL v3](./LICENSE)
