/**
 * Stonefire - State Management
 * Redux-like state management with immutable updates
 */

// Event emitter for game events
class EventEmitter {
    constructor() {
        this.listeners = {};
    }

    on(event, callback) {
        if (!this.listeners[event]) {
            this.listeners[event] = [];
        }
        this.listeners[event].push(callback);
        return () => this.off(event, callback);
    }

    off(event, callback) {
        if (!this.listeners[event]) return;
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }

    emit(event, ...args) {
        if (!this.listeners[event]) return;
        this.listeners[event].forEach(callback => callback(...args));
    }

    clear() {
        this.listeners = {};
    }
}

// Global event emitter
export const events = new EventEmitter();

// Action types
export const ActionTypes = {
    // Game flow
    START_GAME: 'START_GAME',
    END_TURN: 'END_TURN',
    START_TURN: 'START_TURN',

    // Card actions
    DRAW_CARD: 'DRAW_CARD',
    PLAY_CARD: 'PLAY_CARD',
    DISCARD_CARD: 'DISCARD_CARD',

    // Combat
    ATTACK: 'ATTACK',
    DEAL_DAMAGE: 'DEAL_DAMAGE',
    HEAL: 'HEAL',

    // Creature state
    SUMMON_CREATURE: 'SUMMON_CREATURE',
    DESTROY_CREATURE: 'DESTROY_CREATURE',
    MODIFY_CREATURE: 'MODIFY_CREATURE',
    SET_CAN_ATTACK: 'SET_CAN_ATTACK',

    // Player state
    MODIFY_MANA: 'MODIFY_MANA',
    MODIFY_HEALTH: 'MODIFY_HEALTH',

    // Game state
    SET_GAME_OVER: 'SET_GAME_OVER',
    SET_SELECTION: 'SET_SELECTION',
    CLEAR_SELECTION: 'CLEAR_SELECTION'
};

// Initial state factory
function createInitialState() {
    return {
        turn: 0,
        activePlayer: 'player', // 'player' | 'enemy'
        phase: 'main', // 'main' | 'combat' | 'end'
        gameOver: false,
        winner: null,

        player: createPlayerState(),
        enemy: createPlayerState(),

        // UI state
        selection: {
            type: null, // 'hand_card' | 'board_creature' | null
            cardId: null,
            playerId: null
        }
    };
}

function createPlayerState() {
    return {
        health: 30,
        maxHealth: 30,
        mana: 0,
        maxMana: 0,
        hand: [],
        board: [], // Array of up to 7 creatures
        deck: [],
        graveyard: []
    };
}

// Generate unique IDs for card instances
let cardInstanceId = 0;
export function generateCardInstanceId() {
    return `card_${++cardInstanceId}`;
}

// Reset instance ID counter (for new games or restoring saves)
export function resetCardInstanceId(startFrom = 0) {
    cardInstanceId = startFrom;
}

// Create a card instance from a card definition
export function createCardInstance(cardDef) {
    return {
        ...cardDef,
        instanceId: generateCardInstanceId(),
        currentAttack: cardDef.attack || 0,
        currentHealth: cardDef.health || 0,
        maxHealth: cardDef.health || 0,
        canAttack: false,
        hasAttacked: false,
        summoningSick: true, // Can't attack the turn it's played (unless Charge)
        buffs: [],
        debuffs: []
    };
}

// State store
class Store {
    constructor(reducer, initialState) {
        this.state = initialState;
        this.reducer = reducer;
        this.subscribers = [];
    }

    getState() {
        return this.state;
    }

    dispatch(action) {
        const previousState = this.state;
        this.state = this.reducer(this.state, action);

        // Notify subscribers of state change
        this.subscribers.forEach(callback => callback(this.state, previousState, action));

        // Emit action-specific events
        events.emit(action.type, action.payload, this.state);

        // If the reducer set the game over flag, emit a GAME_OVER event so UI and systems can react
        if (!previousState.gameOver && this.state.gameOver) {
            events.emit('GAME_OVER', { winner: this.state.winner });
        }

        return action;
    }

    subscribe(callback) {
        this.subscribers.push(callback);
        return () => {
            this.subscribers = this.subscribers.filter(cb => cb !== callback);
        };
    }

    reset() {
        resetCardInstanceId();
        this.state = createInitialState();
        this.subscribers.forEach(callback => callback(this.state, null, { type: 'RESET' }));
    }

    /**
     * Restore state from a saved game
     * @param {object} savedState - The saved game state to restore
     */
    restoreState(savedState) {
        // Find the highest instanceId in the saved state to avoid collisions
        let maxId = 0;
        const findMaxId = (obj) => {
            if (!obj) return;
            if (typeof obj === 'object') {
                if (obj.instanceId && typeof obj.instanceId === 'string') {
                    const num = parseInt(obj.instanceId.replace('card_', ''), 10);
                    if (!isNaN(num) && num > maxId) maxId = num;
                }
                for (const key of Object.keys(obj)) {
                    findMaxId(obj[key]);
                }
            }
        };
        findMaxId(savedState);

        // Reset card instance counter to continue from highest saved ID
        resetCardInstanceId(maxId);

        this.state = deepClone(savedState);
        this.subscribers.forEach(callback => callback(this.state, null, { type: 'RESTORE' }));
    }
}

// Deep clone helper
function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Reducer - handles all state transitions
function gameReducer(state, action) {
    const { type, payload } = action;

    switch (type) {
        case ActionTypes.START_GAME: {
            const newState = createInitialState();
            newState.turn = 1;
            newState.player.deck = payload.playerDeck.map(createCardInstance);
            newState.enemy.deck = payload.enemyDeck.map(createCardInstance);
            return newState;
        }

        case ActionTypes.START_TURN: {
            const newState = deepClone(state);
            const player = newState[payload.player];

            // Increment max mana (up to 10)
            if (player.maxMana < 10) {
                player.maxMana++;
            }

            // Refresh mana
            player.mana = player.maxMana;

            // Reset attack flags for all creatures
            player.board.forEach(creature => {
                if (creature) {
                    creature.hasAttacked = false;
                    // Remove summoning sickness at start of owner's turn
                    if (creature.summoningSick) {
                        creature.summoningSick = false;
                    }
                    // Update canAttack based on current state
                    creature.canAttack = !creature.summoningSick && creature.currentAttack > 0;
                }
            });

            newState.activePlayer = payload.player;
            newState.phase = 'main';

            if (payload.player === 'player') {
                newState.turn++;
            }

            return newState;
        }

        case ActionTypes.END_TURN: {
            const newState = deepClone(state);
            newState.phase = 'end';
            return newState;
        }

        case ActionTypes.DRAW_CARD: {
            const newState = deepClone(state);
            const player = newState[payload.player];

            if (player.deck.length === 0) {
                // Fatigue damage would go here
                return newState;
            }

            // Hand limit of 10
            if (player.hand.length >= 10) {
                // Card is burned
                const burnedCard = player.deck.shift();
                player.graveyard.push(burnedCard);
                events.emit('CARD_BURNED', { player: payload.player, card: burnedCard });
                return newState;
            }

            const drawnCard = player.deck.shift();
            player.hand.push(drawnCard);

            return newState;
        }

        case ActionTypes.PLAY_CARD: {
            const newState = deepClone(state);
            const player = newState[payload.player];

            const cardIndex = player.hand.findIndex(c => c.instanceId === payload.cardId);
            if (cardIndex === -1) return state;

            const card = player.hand[cardIndex];

            // Check mana cost
            if (card.cost > player.mana) return state;

            // Deduct mana
            player.mana -= card.cost;

            // Remove from hand
            player.hand.splice(cardIndex, 1);

            // Handle based on card type
            if (card.type === 'creature') {
                // Check board space
                if (player.board.length >= 7) return state;

                // Add to board
                const creature = { ...card };
                creature.summoningSick = !card.keywords?.includes('charge');
                creature.canAttack = card.keywords?.includes('charge') && creature.currentAttack > 0;
                player.board.push(creature);

                events.emit('CREATURE_SUMMONED', { player: payload.player, creature });
            } else if (card.type === 'spell') {
                // Spell effect is handled by effects.js
                player.graveyard.push(card);
                events.emit('SPELL_CAST', { player: payload.player, card, target: payload.target });
            } else if (card.type === 'relic') {
                // Relic handling
                events.emit('RELIC_PLAYED', { player: payload.player, card });
            }

            return newState;
        }

        case ActionTypes.SUMMON_CREATURE: {
            const newState = deepClone(state);
            const player = newState[payload.player];

            // Check board space
            if (player.board.length >= 7) return state;

            // Add creature directly to board
            const creature = {
                ...payload.creature,
                instanceId: payload.creature.instanceId || `token_${Date.now()}`,
                currentAttack: payload.creature.attack,
                currentHealth: payload.creature.health,
                maxHealth: payload.creature.health,
                canAttack: payload.creature.keywords?.includes('charge'),
                hasAttacked: false,
                summoningSick: !payload.creature.keywords?.includes('charge')
            };
            player.board.push(creature);

            return newState;
        }

        case ActionTypes.ATTACK: {
            const newState = deepClone(state);
            const { attackerId, targetId, attackerPlayer } = payload;

            const attacker = findCreature(newState, attackerPlayer, attackerId);
            if (!attacker || !attacker.canAttack || attacker.hasAttacked) return state;

            attacker.hasAttacked = true;
            attacker.canAttack = false;

            return newState;
        }

        case ActionTypes.DEAL_DAMAGE: {
            const newState = deepClone(state);
            const { targetId, targetPlayer, amount, sourceId } = payload;

            if (targetId === 'hero') {
                // Damage to hero
                const player = newState[targetPlayer];
                player.health = Math.max(0, player.health - amount);

                if (player.health <= 0) {
                    newState.gameOver = true;
                    newState.winner = targetPlayer === 'player' ? 'enemy' : 'player';
                }
            } else {
                // Damage to creature
                const creature = findCreature(newState, targetPlayer, targetId);
                if (creature) {
                    // Apply Armored reduction
                    let actualDamage = amount;
                    const armored = creature.keywords?.find(k => k.startsWith('armored'));
                    if (armored) {
                        const armorValue = parseInt(armored.split('_')[1]) || 0;
                        actualDamage = Math.max(0, amount - armorValue);
                    }

                    creature.currentHealth -= actualDamage;

                    events.emit('DAMAGE_DEALT', {
                        sourceId,
                        targetId,
                        targetPlayer,
                        amount: actualDamage
                    });
                }
            }

            return newState;
        }

        case ActionTypes.HEAL: {
            const newState = deepClone(state);
            const { targetId, targetPlayer, amount } = payload;

            if (targetId === 'hero') {
                const player = newState[targetPlayer];
                // Allow health to exceed maxHealth (no cap)
                player.health = player.health + amount;
            } else {
                const creature = findCreature(newState, targetPlayer, targetId);
                if (creature) {
                    // Allow health to exceed maxHealth (no cap)
                    creature.currentHealth = creature.currentHealth + amount;
                }
            }

            return newState;
        }

        case ActionTypes.DESTROY_CREATURE: {
            const newState = deepClone(state);
            const { creatureId, player: playerKey } = payload;

            const player = newState[playerKey];
            const creatureIndex = player.board.findIndex(c => c?.instanceId === creatureId);

            if (creatureIndex !== -1) {
                const creature = player.board[creatureIndex];
                player.board.splice(creatureIndex, 1);
                player.graveyard.push(creature);

                events.emit('CREATURE_DIED', { player: playerKey, creature });
            }

            return newState;
        }

        case ActionTypes.MODIFY_CREATURE: {
            const newState = deepClone(state);
            const { creatureId, player: playerKey, changes } = payload;

            const creature = findCreature(newState, playerKey, creatureId);
            if (creature) {
                Object.assign(creature, changes);
            }

            return newState;
        }

        case ActionTypes.SET_CAN_ATTACK: {
            const newState = deepClone(state);
            const { creatureId, player: playerKey, canAttack } = payload;

            const creature = findCreature(newState, playerKey, creatureId);
            if (creature) {
                creature.canAttack = canAttack;
            }

            return newState;
        }

        case ActionTypes.MODIFY_MANA: {
            const newState = deepClone(state);
            const player = newState[payload.player];

            if (payload.current !== undefined) {
                player.mana = Math.max(0, Math.min(10, payload.current));
            }
            if (payload.max !== undefined) {
                player.maxMana = Math.max(0, Math.min(10, payload.max));
            }

            return newState;
        }

        case ActionTypes.MODIFY_HEALTH: {
            const newState = deepClone(state);
            const player = newState[payload.player];

            // Allow health to exceed maxHealth, but not go below 0
            player.health = Math.max(0, payload.health);

            if (player.health <= 0) {
                newState.gameOver = true;
                newState.winner = payload.player === 'player' ? 'enemy' : 'player';
            }

            return newState;
        }

        case ActionTypes.SET_GAME_OVER: {
            const newState = deepClone(state);
            newState.gameOver = true;
            newState.winner = payload.winner;
            return newState;
        }

        case ActionTypes.SET_SELECTION: {
            const newState = deepClone(state);
            newState.selection = {
                type: payload.type,
                cardId: payload.cardId,
                playerId: payload.playerId
            };
            return newState;
        }

        case ActionTypes.CLEAR_SELECTION: {
            const newState = deepClone(state);
            newState.selection = {
                type: null,
                cardId: null,
                playerId: null
            };
            return newState;
        }

        default:
            return state;
    }
}

// Helper to find creature in state
function findCreature(state, playerKey, creatureId) {
    const player = state[playerKey];
    return player.board.find(c => c?.instanceId === creatureId);
}

// Create and export the store
export const store = new Store(gameReducer, createInitialState());

// Action creators
export const actions = {
    startGame: (playerDeck, enemyDeck) => ({
        type: ActionTypes.START_GAME,
        payload: { playerDeck, enemyDeck }
    }),

    startTurn: (player) => ({
        type: ActionTypes.START_TURN,
        payload: { player }
    }),

    endTurn: () => ({
        type: ActionTypes.END_TURN,
        payload: {}
    }),

    drawCard: (player) => ({
        type: ActionTypes.DRAW_CARD,
        payload: { player }
    }),

    playCard: (player, cardId, target = null) => ({
        type: ActionTypes.PLAY_CARD,
        payload: { player, cardId, target }
    }),

    attack: (attackerPlayer, attackerId, targetPlayer, targetId) => ({
        type: ActionTypes.ATTACK,
        payload: { attackerPlayer, attackerId, targetPlayer, targetId }
    }),

    dealDamage: (targetPlayer, targetId, amount, sourceId = null) => ({
        type: ActionTypes.DEAL_DAMAGE,
        payload: { targetPlayer, targetId, amount, sourceId }
    }),

    heal: (targetPlayer, targetId, amount) => ({
        type: ActionTypes.HEAL,
        payload: { targetPlayer, targetId, amount }
    }),

    destroyCreature: (player, creatureId) => ({
        type: ActionTypes.DESTROY_CREATURE,
        payload: { player, creatureId }
    }),

    summonCreature: (player, creature) => ({
        type: ActionTypes.SUMMON_CREATURE,
        payload: { player, creature }
    }),

    modifyCreature: (player, creatureId, changes) => ({
        type: ActionTypes.MODIFY_CREATURE,
        payload: { player, creatureId, changes }
    }),

    setCanAttack: (player, creatureId, canAttack) => ({
        type: ActionTypes.SET_CAN_ATTACK,
        payload: { player, creatureId, canAttack }
    }),

    modifyMana: (player, current, max) => ({
        type: ActionTypes.MODIFY_MANA,
        payload: { player, current, max }
    }),

    setGameOver: (winner) => ({
        type: ActionTypes.SET_GAME_OVER,
        payload: { winner }
    }),

    setSelection: (type, cardId, playerId) => ({
        type: ActionTypes.SET_SELECTION,
        payload: { type, cardId, playerId }
    }),

    clearSelection: () => ({
        type: ActionTypes.CLEAR_SELECTION,
        payload: {}
    })
};
