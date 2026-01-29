/**
 * Stonefire - AI Personalities
 * Faction-specific AI behaviors and taunts
 */

/**
 * AI Personality configurations by faction
 * AGGRESSION: 0 = defensive, 1 = aggressive (affects face vs trade decisions)
 * RANDOMNESS: Chance to make suboptimal plays (adds variety)
 * TRADE_PREFERENCE: Higher = prefers trading, lower = prefers face
 * BOARD_CONTROL_WEIGHT: How much AI values board presence
 * HEALTH_WEIGHT: How much AI values its own health
 */
export const AI_PERSONALITIES = {
    TRIASSIC: {
        name: 'Triassic',
        style: 'adaptive',
        description: 'Early dominance - balanced and adaptable',
        AGGRESSION: 0.5,
        RANDOMNESS: 0.15,
        TRADE_PREFERENCE: 1.0,
        BOARD_CONTROL_WEIGHT: 1.0,
        HEALTH_WEIGHT: 1.0,
        THINK_DELAY: 800,
        ACTION_DELAY: 600
    },
    JURASSIC: {
        name: 'Jurassic',
        style: 'aggressive',
        description: 'Giant beasts - aggressive and relentless',
        AGGRESSION: 0.75,
        RANDOMNESS: 0.1,
        TRADE_PREFERENCE: 0.7,
        BOARD_CONTROL_WEIGHT: 0.8,
        HEALTH_WEIGHT: 0.9,
        THINK_DELAY: 600,
        ACTION_DELAY: 500
    },
    CRETACEOUS: {
        name: 'Cretaceous',
        style: 'hyper-aggressive',
        description: 'Apex predators - always going for the kill',
        AGGRESSION: 0.9,
        RANDOMNESS: 0.05,
        TRADE_PREFERENCE: 0.5,
        BOARD_CONTROL_WEIGHT: 0.6,
        HEALTH_WEIGHT: 0.7,
        THINK_DELAY: 500,
        ACTION_DELAY: 400
    },
    PRIMORDIAL: {
        name: 'Primordial',
        style: 'control',
        description: 'Ancient power - patient and controlling',
        AGGRESSION: 0.3,
        RANDOMNESS: 0.1,
        TRADE_PREFERENCE: 1.5,
        BOARD_CONTROL_WEIGHT: 1.4,
        HEALTH_WEIGHT: 1.2,
        THINK_DELAY: 1000,
        ACTION_DELAY: 700
    },
    ICE_AGE: {
        name: 'Ice Age',
        style: 'defensive',
        description: 'Frozen fury - defensive and resilient',
        AGGRESSION: 0.35,
        RANDOMNESS: 0.12,
        TRADE_PREFERENCE: 1.3,
        BOARD_CONTROL_WEIGHT: 1.2,
        HEALTH_WEIGHT: 1.5,
        THINK_DELAY: 900,
        ACTION_DELAY: 650
    },
    NEUTRAL: {
        name: 'Neutral',
        style: 'balanced',
        description: 'Balanced mix - unpredictable',
        AGGRESSION: 0.5,
        RANDOMNESS: 0.2,
        TRADE_PREFERENCE: 1.0,
        BOARD_CONTROL_WEIGHT: 1.0,
        HEALTH_WEIGHT: 1.0,
        THINK_DELAY: 800,
        ACTION_DELAY: 600
    }
};

/**
 * Taunt categories and when they trigger
 */
export const TAUNT_TRIGGERS = {
    TURN_START: 'turn_start',
    CARD_PLAYED: 'card_played',
    ATTACK: 'attack',
    KILL: 'kill',
    TAKE_DAMAGE: 'take_damage',
    LOW_HEALTH: 'low_health',
    HAS_LETHAL: 'has_lethal',
    VICTORY: 'victory'
};

/**
 * Faction-specific taunts
 */
export const FACTION_TAUNTS = {
    TRIASSIC: {
        turn_start: [
            "The dawn of dominance begins...",
            "Evolution favors the prepared.",
            "Let's see what you've got.",
            "Time to adapt and overcome."
        ],
        card_played: [
            "Behold, the first rulers!",
            "From the ancient seas, we rise!",
            "Nature finds a way.",
            "Primitive, but effective."
        ],
        attack: [
            "Strike swiftly!",
            "The hunt begins!",
            "No escape from evolution!",
            "Feel the bite of progress!"
        ],
        kill: [
            "Survival of the fittest.",
            "Another one extinct.",
            "Nature is cruel, but fair.",
            "Only the strong survive."
        ],
        take_damage: [
            "A minor setback.",
            "We've survived worse.",
            "Pain breeds adaptation.",
            "Hmm, interesting..."
        ],
        low_health: [
            "Backed into a corner...",
            "Time to evolve or die!",
            "This isn't over yet!",
            "Desperation breeds innovation!"
        ],
        has_lethal: [
            "Your time has come.",
            "Evolution ends here... for you.",
            "The cycle completes.",
            "Extinction awaits."
        ],
        victory: [
            "The Triassic prevails!",
            "Evolution is complete.",
            "Dominance achieved.",
            "The first era triumphs!"
        ]
    },
    JURASSIC: {
        turn_start: [
            "The giants awaken!",
            "Tremble before me!",
            "Your doom approaches!",
            "Time to crush you!"
        ],
        card_played: [
            "ROOOAR!",
            "Feel the earth shake!",
            "Massive power unleashed!",
            "Size matters!"
        ],
        attack: [
            "CRUSH THEM!",
            "Nothing can stop us!",
            "Overwhelming force!",
            "CHARGE!"
        ],
        kill: [
            "Squashed like a bug!",
            "Pathetic!",
            "Was that supposed to stop me?",
            "Another one falls!"
        ],
        take_damage: [
            "Is that all you've got?!",
            "That tickles!",
            "You'll pay for that!",
            "RRRGH!"
        ],
        low_health: [
            "A wounded beast is dangerous!",
            "You've made me angry!",
            "NOW you've done it!",
            "This changes nothing!"
        ],
        has_lethal: [
            "PREY SPOTTED!",
            "This ends NOW!",
            "No escape!",
            "EXTINCTION TIME!"
        ],
        victory: [
            "The Jurassic DOMINATES!",
            "UNSTOPPABLE!",
            "Giants always win!",
            "ROOOAAAR! Victory!"
        ]
    },
    CRETACEOUS: {
        turn_start: [
            "The apex predator has arrived.",
            "Fear is a survival instinct. Use it.",
            "Let the hunt begin.",
            "You're already dead. You just don't know it."
        ],
        card_played: [
            "Witness perfection.",
            "The food chain has spoken.",
            "Calculated. Precise. Lethal.",
            "Every move brings your end closer."
        ],
        attack: [
            "No mercy.",
            "Swift and lethal.",
            "The killing stroke.",
            "Nowhere to hide."
        ],
        kill: [
            "As expected.",
            "Inferior specimen eliminated.",
            "Clean kill.",
            "You never stood a chance."
        ],
        take_damage: [
            "A tactical miscalculation.",
            "Noted. And irrelevant.",
            "You'll regret that.",
            "Interesting. But futile."
        ],
        low_health: [
            "A cornered predator...",
            "You think you've won?",
            "The most dangerous game.",
            "This only makes me more lethal."
        ],
        has_lethal: [
            "Checkmate.",
            "Your extinction is assured.",
            "The hunt concludes.",
            "No survivors."
        ],
        victory: [
            "Apex predator. Apex victory.",
            "The Cretaceous reigns supreme.",
            "Perfection achieved.",
            "As it was always meant to be."
        ]
    },
    PRIMORDIAL: {
        turn_start: [
            "The ancient ones stir...",
            "Patience. All things come in time.",
            "The old ways are the true ways.",
            "From the depths, wisdom rises."
        ],
        card_played: [
            "Ancient power awakens.",
            "Feel the weight of ages.",
            "This has been foreseen.",
            "The primordial forces gather."
        ],
        attack: [
            "Inevitable.",
            "Time erodes all resistance.",
            "The old ones strike.",
            "Ancient wrath unleashed."
        ],
        kill: [
            "Return to the void.",
            "Ashes to ashes.",
            "The cycle continues.",
            "As it was written."
        ],
        take_damage: [
            "A fleeting wound.",
            "We have endured eons.",
            "Pain is temporary.",
            "The ancient ones remember."
        ],
        low_health: [
            "Even the ancients can fall...",
            "But we shall rise again!",
            "This vessel weakens...",
            "The primordial fire still burns!"
        ],
        has_lethal: [
            "Your end was written in stone.",
            "Return to the primordial soup.",
            "The ancients claim their due.",
            "Time has run out."
        ],
        victory: [
            "The ancient ways triumph.",
            "Primordial power is eternal.",
            "As it was, so it shall be.",
            "The old ones are pleased."
        ]
    },
    ICE_AGE: {
        turn_start: [
            "Winter is here.",
            "Feel the cold embrace.",
            "The ice age never truly ended.",
            "Frozen solid? Not yet."
        ],
        card_played: [
            "From the frozen wastes...",
            "Ice preserves all.",
            "Cold. Calculating. Perfect.",
            "The glacier advances."
        ],
        attack: [
            "Cold fury!",
            "Freeze!",
            "The chill of death!",
            "Winter's bite!"
        ],
        kill: [
            "Frozen and forgotten.",
            "Preserved for eternity.",
            "Ice cold.",
            "Another frozen trophy."
        ],
        take_damage: [
            "The cold numbs all pain.",
            "Ice cracks, but doesn't break.",
            "A minor thaw.",
            "Still standing. Still cold."
        ],
        low_health: [
            "The ice is thinning...",
            "Even glaciers can melt...",
            "But winter always returns!",
            "Cold desperation!"
        ],
        has_lethal: [
            "Your blood runs cold.",
            "The final freeze.",
            "Winter claims another.",
            "Ice... cold... death."
        ],
        victory: [
            "The Ice Age claims victory!",
            "Frozen in defeat.",
            "Winter reigns eternal.",
            "Cold-blooded triumph."
        ]
    },
    NEUTRAL: {
        turn_start: [
            "Interesting...",
            "Let's see what happens.",
            "No allegiance, no mercy.",
            "The wild card plays."
        ],
        card_played: [
            "Surprise!",
            "Expect the unexpected.",
            "A little chaos never hurt.",
            "Random chance? Perhaps."
        ],
        attack: [
            "Why not?",
            "For fun!",
            "Here goes nothing!",
            "Attack!"
        ],
        kill: [
            "Oops!",
            "Didn't see that coming, did you?",
            "Lucky shot!",
            "That worked!"
        ],
        take_damage: [
            "Ow!",
            "Rude!",
            "That wasn't very nice.",
            "Okay, okay..."
        ],
        low_health: [
            "Getting dicey!",
            "This is fine. Totally fine.",
            "Time for desperate measures!",
            "Uh oh..."
        ],
        has_lethal: [
            "Wait, I'm winning?!",
            "Time to end this!",
            "Here we go!",
            "Victory approaches!"
        ],
        victory: [
            "Ha! Didn't expect that!",
            "Neutral wins!",
            "No faction needed!",
            "Wild card takes all!"
        ]
    }
};

/**
 * Get a random taunt for a faction and trigger
 */
export function getTaunt(faction, trigger) {
    const factionKey = faction?.toUpperCase() || 'NEUTRAL';
    const taunts = FACTION_TAUNTS[factionKey]?.[trigger] || FACTION_TAUNTS.NEUTRAL[trigger];

    if (!taunts || taunts.length === 0) return null;

    return taunts[Math.floor(Math.random() * taunts.length)];
}

/**
 * Get AI personality config for a faction
 */
export function getPersonality(faction) {
    const factionKey = faction?.toUpperCase() || 'NEUTRAL';
    return AI_PERSONALITIES[factionKey] || AI_PERSONALITIES.NEUTRAL;
}

/**
 * Taunt probability by trigger type (to avoid spam)
 */
export const TAUNT_PROBABILITY = {
    turn_start: 0.35,     // Chance to taunt at turn start
    card_played: 0.2,     // Chance when playing a card
    attack: 0.15,         // Chance when attacking
    kill: 0.45,           // Chance when killing a creature
    take_damage: 0.25,    // Chance when taking damage
    low_health: 0.6,      // Chance when at low health
    has_lethal: 0.9,      // Chance when having lethal
    victory: 1.0          // Always taunt on victory
};

/**
 * Should AI taunt for this trigger?
 */
export function shouldTaunt(trigger) {
    const probability = TAUNT_PROBABILITY[trigger] || 0.3;
    return Math.random() < probability;
}
