/**
 * Stonefire - Card Database
 * All card definitions organized by faction
 */

// Card type constants
export const CardType = {
    CREATURE: 'creature',
    SPELL: 'spell',
    RELIC: 'relic'
};

// Faction constants
export const Faction = {
    TRIASSIC: 'triassic',
    JURASSIC: 'jurassic',
    CRETACEOUS: 'cretaceous',
    PRIMORDIAL: 'primordial',
    ICE_AGE: 'iceage',
    NEUTRAL: 'neutral'
};

// Faction emoji icons for placeholder art
const FactionIcons = {
    [Faction.TRIASSIC]: '🦎',
    [Faction.JURASSIC]: '🦖',
    [Faction.CRETACEOUS]: '🦕',
    [Faction.PRIMORDIAL]: '🐙',
    [Faction.ICE_AGE]: '🦣',
    [Faction.NEUTRAL]: '🦴'
};

/**
 * All cards in the game
 */
export const CARDS = {
    // ============================================
    // TRIASSIC FACTION - Evolve mechanics, growing threats
    // ============================================

    tri_001: {
        id: 'tri_001',
        name: 'Eoraptor Scout',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦎'
    },

    tri_002: {
        id: 'tri_002',
        name: 'Coelophysis Hunter',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 1
        },
        text: 'Battlecry: Draw a card.',
        icon: '🦎'
    },

    tri_003: {
        id: 'tri_003',
        name: 'Plateosaurus',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 3,
        attack: 2,
        health: 4,
        keywords: [],
        text: '',
        icon: '🦕'
    },

    tri_004: {
        id: 'tri_004',
        name: 'Herrerasaurus',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 3,
        attack: 3,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦖'
    },

    tri_005: {
        id: 'tri_005',
        name: 'Postosuchus',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 4,
        attack: 4,
        health: 3,
        keywords: [],
        battlecry: {
            type: 'damage',
            target: 'target',
            amount: 1
        },
        targetType: 'any_creature',
        requiresTarget: true,
        text: 'Battlecry: Deal 1 damage.',
        icon: '🐊'
    },

    tri_006: {
        id: 'tri_006',
        name: 'Adaptive Hatchling',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 2,
        attack: 1,
        health: 1,
        keywords: [],
        evolveCondition: {
            type: 'board_count',
            operator: '>=',
            value: 3
        },
        evolveInto: {
            name: 'Evolved Predator',
            attack: 4,
            health: 4,
            keywords: ['charge'],
            text: 'Evolved form.'
        },
        text: 'Evolve: When you control 3+ creatures, become a 4/4 with Charge.',
        icon: '🥒'
    },

    tri_007: {
        id: 'tri_007',
        name: 'Triassic Growth',
        faction: Faction.TRIASSIC,
        type: CardType.SPELL,
        cost: 2,
        effect: {
            type: 'buff',
            target: 'all_friendly',
            attack: 1,
            health: 1
        },
        text: 'Give all friendly creatures +1/+1.',
        icon: '🌿'
    },

    tri_008: {
        id: 'tri_008',
        name: 'Survival Instinct',
        faction: Faction.TRIASSIC,
        type: CardType.SPELL,
        cost: 1,
        effect: {
            type: 'buff',
            target: 'target',
            attack: 2,
            health: 0
        },
        targetType: 'friendly_creature',
        requiresTarget: true,
        text: 'Give a friendly creature +2 Attack.',
        icon: '💪'
    },

    tri_009: {
        id: 'tri_009',
        name: 'Liliensternus',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 3,
        attack: 3,
        health: 3,
        keywords: [],
        battlecry: {
            type: 'buff',
            target: 'self',
            attack: 1,
            health: 1
        },
        text: 'Battlecry: Gain +1/+1 for each other friendly creature.',
        icon: '🦖'
    },

    tri_010: {
        id: 'tri_010',
        name: 'Procompsognathus Pack',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 2,
        attack: 1,
        health: 1,
        keywords: [],
        battlecry: {
            type: 'summon',
            count: 1,
            creature: {
                name: 'Procompsognathus',
                attack: 1,
                health: 1,
                keywords: []
            }
        },
        text: 'Battlecry: Summon a 1/1 Procompsognathus.',
        icon: '🦎'
    },

    tri_011: {
        id: 'tri_011',
        name: 'Nothosaurus',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 4,
        attack: 3,
        health: 4,
        keywords: [],
        abilities: [{
            trigger: 'TURN_END',
            triggerPlayer: 'self',
            effect: {
                type: 'heal',
                target: 'self',
                amount: 1
            }
        }],
        text: 'At the end of your turn, restore 1 health.',
        icon: '🦎'
    },

    tri_012: {
        id: 'tri_012',
        name: 'Cynodont',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 1,
        attack: 2,
        health: 1,
        keywords: [],
        text: '',
        icon: '🦔'
    },

    tri_013: {
        id: 'tri_013',
        name: 'Effigia',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 5,
        attack: 4,
        health: 5,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 2
        },
        text: 'Battlecry: Draw 2 cards.',
        icon: '🦎'
    },

    tri_014: {
        id: 'tri_014',
        name: 'Era of Change',
        faction: Faction.TRIASSIC,
        type: CardType.SPELL,
        cost: 4,
        effect: {
            type: 'multiple',
            effects: [
                { type: 'buff', target: 'all_friendly', attack: 2, health: 0 },
                { type: 'draw', amount: 1 }
            ]
        },
        text: 'Give all friendly creatures +2 Attack. Draw a card.',
        icon: '🌅'
    },

    tri_015: {
        id: 'tri_015',
        name: 'Desmatosuchus',
        faction: Faction.TRIASSIC,
        type: CardType.CREATURE,
        cost: 6,
        attack: 3,
        health: 7,
        keywords: ['guard', 'armored_1'],
        text: 'Guard. Armored 1',
        icon: '🐊'
    },

    tri_016: {
        id: 'tri_016',
        name: 'Triassic Ambush',
        faction: Faction.TRIASSIC,
        type: CardType.SPELL,
        cost: 3,
        effect: {
            type: 'summon',
            count: 2,
            creature: {
                name: 'Ambusher',
                attack: 2,
                health: 1,
                keywords: ['charge']
            }
        },
        text: 'Summon two 2/1 Ambushers with Charge.',
        icon: '🌿'
    },

    // ============================================
    // JURASSIC FACTION - Big creatures, aggression
    // ============================================

    jur_001: {
        id: 'jur_001',
        name: 'Raptor Hatchling',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 1,
        attack: 2,
        health: 1,
        keywords: [],
        text: '',
        icon: '🦖'
    },

    jur_002: {
        id: 'jur_002',
        name: 'Dilophosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 2,
        attack: 3,
        health: 2,
        keywords: ['venomous'],
        text: 'Venomous',
        icon: '🦎'
    },

    jur_003: {
        id: 'jur_003',
        name: 'Allosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 4,
        attack: 5,
        health: 4,
        keywords: [],
        text: '',
        icon: '🦖'
    },

    jur_004: {
        id: 'jur_004',
        name: 'Ceratosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 3,
        attack: 4,
        health: 2,
        keywords: [],
        text: '',
        icon: '🦖'
    },

    jur_005: {
        id: 'jur_005',
        name: 'Brachiosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 6,
        attack: 4,
        health: 8,
        keywords: ['guard'],
        text: 'Guard',
        icon: '🦕'
    },

    jur_006: {
        id: 'jur_006',
        name: 'Tyrannosaurus Rex',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 8,
        attack: 8,
        health: 6,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦖'
    },

    jur_007: {
        id: 'jur_007',
        name: "Tyrant's Roar",
        faction: Faction.JURASSIC,
        type: CardType.SPELL,
        cost: 4,
        effect: {
            type: 'damage',
            target: 'all_enemies',
            amount: 2
        },
        text: 'Deal 2 damage to all enemy creatures.',
        icon: '📢'
    },

    jur_008: {
        id: 'jur_008',
        name: 'Primal Fury',
        faction: Faction.JURASSIC,
        type: CardType.SPELL,
        cost: 3,
        effect: {
            type: 'buff',
            target: 'target',
            attack: 4,
            health: 0
        },
        targetType: 'friendly_creature',
        requiresTarget: true,
        text: 'Give a creature +4 Attack.',
        icon: '😤'
    },

    jur_009: {
        id: 'jur_009',
        name: 'Stegosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 5,
        attack: 2,
        health: 6,
        keywords: ['guard', 'armored_1'],
        text: 'Guard. Armored 1',
        icon: '🦕'
    },

    jur_010: {
        id: 'jur_010',
        name: 'Compsognathus Swarm',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 1,
        keywords: [],
        extinctEffect: {
            type: 'damage',
            target: 'random_enemy',
            amount: 2
        },
        text: 'Extinct: Deal 2 damage to a random enemy.',
        icon: '🦎'
    },

    jur_011: {
        id: 'jur_011',
        name: 'Ornitholestes',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦖'
    },

    jur_012: {
        id: 'jur_012',
        name: 'Diplodocus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 6,
        attack: 5,
        health: 7,
        keywords: [],
        text: '',
        icon: '🦕'
    },

    jur_013: {
        id: 'jur_013',
        name: 'Carnosaur',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 4,
        attack: 5,
        health: 3,
        keywords: [],
        battlecry: {
            type: 'damage',
            target: 'target',
            amount: 2
        },
        targetType: 'any_creature',
        requiresTarget: true,
        text: 'Battlecry: Deal 2 damage to a creature.',
        icon: '🦖'
    },

    jur_014: {
        id: 'jur_014',
        name: 'Territorial Roar',
        faction: Faction.JURASSIC,
        type: CardType.SPELL,
        cost: 2,
        effect: {
            type: 'damage',
            target: 'target',
            amount: 3
        },
        targetType: 'any_creature',
        requiresTarget: true,
        text: 'Deal 3 damage to a creature.',
        icon: '🔊'
    },

    jur_015: {
        id: 'jur_015',
        name: 'Apatosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 7,
        attack: 6,
        health: 8,
        keywords: [],
        battlecry: {
            type: 'summon',
            count: 1,
            creature: {
                name: 'Young Apatosaurus',
                attack: 3,
                health: 3,
                keywords: []
            }
        },
        text: 'Battlecry: Summon a 3/3 Young Apatosaurus.',
        icon: '🦕'
    },

    jur_016: {
        id: 'jur_016',
        name: 'Blood Frenzy',
        faction: Faction.JURASSIC,
        type: CardType.SPELL,
        cost: 1,
        effect: {
            type: 'multiple',
            effects: [
                { type: 'buff', target: 'target', attack: 3, health: 0 },
                { type: 'damage', target: 'target', amount: 1 }
            ]
        },
        targetType: 'friendly_creature',
        requiresTarget: true,
        text: 'Give a friendly creature +3 Attack. Deal 1 damage to it.',
        icon: '🩸'
    },

    jur_017: {
        id: 'jur_017',
        name: 'Kentrosaurus',
        faction: Faction.JURASSIC,
        type: CardType.CREATURE,
        cost: 3,
        attack: 2,
        health: 4,
        keywords: [],
        abilities: [{
            trigger: 'TAKES_DAMAGE',
            effect: {
                type: 'damage',
                target: 'attacker',
                amount: 2
            }
        }],
        text: 'When this takes damage, deal 2 damage to the attacker.',
        icon: '🦕'
    },

    // ============================================
    // CRETACEOUS FACTION - Card draw, utility, flexibility
    // ============================================

    cre_001: {
        id: 'cre_001',
        name: 'Velociraptor',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 2,
        attack: 3,
        health: 1,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦖'
    },

    cre_002: {
        id: 'cre_002',
        name: 'Troodon Scholar',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 2,
        attack: 1,
        health: 3,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 1
        },
        text: 'Battlecry: Draw a card.',
        icon: '🦎'
    },

    cre_003: {
        id: 'cre_003',
        name: 'Parasaurolophus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 3,
        attack: 2,
        health: 4,
        keywords: [],
        battlecry: {
            type: 'heal',
            target: 'self_hero',
            amount: 3
        },
        text: 'Battlecry: Restore 3 health to your hero.',
        icon: '🦕'
    },

    cre_004: {
        id: 'cre_004',
        name: 'Pachycephalosaurus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 4,
        attack: 3,
        health: 5,
        keywords: [],
        battlecry: {
            type: 'damage',
            target: 'target',
            amount: 2
        },
        targetType: 'enemy_creature',
        requiresTarget: true,
        text: 'Battlecry: Deal 2 damage to an enemy creature.',
        icon: '🦕'
    },

    cre_005: {
        id: 'cre_005',
        name: 'Triceratops',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 5,
        attack: 3,
        health: 7,
        keywords: ['guard'],
        text: 'Guard',
        icon: '🦕'
    },

    cre_006: {
        id: 'cre_006',
        name: 'Ancient Wisdom',
        faction: Faction.CRETACEOUS,
        type: CardType.SPELL,
        cost: 3,
        effect: {
            type: 'draw',
            amount: 2
        },
        text: 'Draw 2 cards.',
        icon: '📚'
    },

    cre_007: {
        id: 'cre_007',
        name: 'Clever Strike',
        faction: Faction.CRETACEOUS,
        type: CardType.SPELL,
        cost: 2,
        effect: {
            type: 'multiple',
            effects: [
                { type: 'damage', target: 'target', amount: 3 },
                { type: 'draw', amount: 1 }
            ]
        },
        targetType: 'enemy_creature',
        requiresTarget: true,
        text: 'Deal 3 damage to an enemy creature. Draw a card.',
        icon: '⚔️'
    },

    cre_008: {
        id: 'cre_008',
        name: 'Ankylosaurus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 6,
        attack: 2,
        health: 8,
        keywords: ['guard', 'armored_2'],
        text: 'Guard. Armored 2',
        icon: '🦕'
    },

    cre_009: {
        id: 'cre_009',
        name: 'Dromaeosaurus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 2,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 1
        },
        text: 'Battlecry: Draw a card.',
        icon: '🦖'
    },

    cre_010: {
        id: 'cre_010',
        name: 'Oviraptor',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        abilities: [{
            trigger: 'CARD_DRAWN',
            triggerPlayer: 'self',
            effect: {
                type: 'buff',
                target: 'self',
                attack: 1,
                health: 0
            }
        }],
        text: 'Whenever you draw a card, gain +1 Attack.',
        icon: '🦖'
    },

    cre_011: {
        id: 'cre_011',
        name: 'Edmontosaurus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 4,
        attack: 3,
        health: 4,
        keywords: [],
        battlecry: {
            type: 'heal',
            target: 'all_friendly',
            amount: 1
        },
        text: 'Battlecry: Restore 1 health to all friendly characters.',
        icon: '🦕'
    },

    cre_012: {
        id: 'cre_012',
        name: 'Corythosaurus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 3,
        attack: 2,
        health: 3,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 1
        },
        text: 'Battlecry: Draw a card.',
        icon: '🦕'
    },

    cre_013: {
        id: 'cre_013',
        name: 'Deinonychus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 4,
        attack: 4,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦖'
    },

    cre_014: {
        id: 'cre_014',
        name: 'Research Expedition',
        faction: Faction.CRETACEOUS,
        type: CardType.SPELL,
        cost: 1,
        effect: {
            type: 'draw',
            amount: 1
        },
        text: 'Draw a card.',
        icon: '🔬'
    },

    cre_015: {
        id: 'cre_015',
        name: 'Spinosaurus',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 7,
        attack: 6,
        health: 6,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 2
        },
        text: 'Battlecry: Draw 2 cards.',
        icon: '🦖'
    },

    cre_016: {
        id: 'cre_016',
        name: 'Tactical Retreat',
        faction: Faction.CRETACEOUS,
        type: CardType.SPELL,
        cost: 2,
        effect: {
            type: 'multiple',
            effects: [
                { type: 'heal', target: 'target', amount: 4 },
                { type: 'draw', amount: 1 }
            ]
        },
        targetType: 'friendly_creature',
        requiresTarget: true,
        text: 'Restore 4 health to a friendly creature. Draw a card.',
        icon: '🏃'
    },

    cre_017: {
        id: 'cre_017',
        name: 'Utahraptor',
        faction: Faction.CRETACEOUS,
        type: CardType.CREATURE,
        cost: 5,
        attack: 5,
        health: 4,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦖'
    },

    // ============================================
    // PRIMORDIAL FACTION - Sea life, control, removal
    // ============================================

    pri_001: {
        id: 'pri_001',
        name: 'Trilobite Swarm',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 1,
        keywords: [],
        extinctEffect: {
            type: 'summon',
            count: 1,
            creature: {
                name: 'Trilobite',
                attack: 1,
                health: 1,
                keywords: []
            }
        },
        text: 'Extinct: Summon a 1/1 Trilobite.',
        icon: '🐚'
    },

    pri_002: {
        id: 'pri_002',
        name: 'Ammonite',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 3,
        keywords: [],
        text: '',
        icon: '🐚'
    },

    pri_003: {
        id: 'pri_003',
        name: 'Anomalocaris',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 3,
        attack: 4,
        health: 2,
        keywords: ['venomous'],
        text: 'Venomous',
        icon: '🦐'
    },

    pri_004: {
        id: 'pri_004',
        name: 'Dunkleosteus',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 5,
        attack: 5,
        health: 5,
        keywords: ['armored_1'],
        text: 'Armored 1',
        icon: '🐟'
    },

    pri_005: {
        id: 'pri_005',
        name: 'Megalodon',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 7,
        attack: 7,
        health: 5,
        keywords: [],
        battlecry: {
            type: 'destroy',
            target: 'target'
        },
        targetType: 'enemy_creature',
        requiresTarget: true,
        text: 'Battlecry: Destroy an enemy creature.',
        icon: '🦈'
    },

    pri_006: {
        id: 'pri_006',
        name: 'Tidal Wave',
        faction: Faction.PRIMORDIAL,
        type: CardType.SPELL,
        cost: 5,
        effect: {
            type: 'damage',
            target: 'all_creatures',
            amount: 3
        },
        text: 'Deal 3 damage to ALL creatures.',
        icon: '🌊'
    },

    pri_007: {
        id: 'pri_007',
        name: 'Primordial Ooze',
        faction: Faction.PRIMORDIAL,
        type: CardType.SPELL,
        cost: 2,
        effect: {
            type: 'debuff',
            target: 'target',
            attack: 2,
            health: 0
        },
        targetType: 'enemy_creature',
        requiresTarget: true,
        text: 'Give an enemy creature -2 Attack.',
        icon: '🫠'
    },

    pri_008: {
        id: 'pri_008',
        name: 'Ancient Leviathan',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 9,
        attack: 6,
        health: 10,
        keywords: ['guard'],
        battlecry: {
            type: 'damage',
            target: 'all_enemies',
            amount: 2
        },
        text: 'Guard. Battlecry: Deal 2 damage to all enemies.',
        icon: '🐙'
    },

    pri_009: {
        id: 'pri_009',
        name: 'Nautilus',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 2,
        keywords: [],
        text: '',
        icon: '🐚'
    },

    pri_010: {
        id: 'pri_010',
        name: 'Sea Scorpion',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 1,
        keywords: ['venomous'],
        text: 'Venomous',
        icon: '🦂'
    },

    pri_011: {
        id: 'pri_011',
        name: 'Coelacanth',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 3,
        attack: 2,
        health: 4,
        keywords: [],
        abilities: [{
            trigger: 'TURN_START',
            triggerPlayer: 'self',
            effect: {
                type: 'heal',
                target: 'self_hero',
                amount: 1
            }
        }],
        text: 'At the start of your turn, restore 1 health to your hero.',
        icon: '🐟'
    },

    pri_012: {
        id: 'pri_012',
        name: 'Mosasaurus',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 6,
        attack: 6,
        health: 5,
        keywords: [],
        battlecry: {
            type: 'destroy',
            target: 'target'
        },
        targetType: 'enemy_creature',
        requiresTarget: true,
        text: 'Battlecry: Destroy an enemy creature with 3 or less Attack.',
        icon: '🐊'
    },

    pri_013: {
        id: 'pri_013',
        name: 'Abyssal Terror',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 4,
        attack: 4,
        health: 4,
        keywords: [],
        battlecry: {
            type: 'debuff',
            target: 'all_enemies',
            attack: 1,
            health: 0
        },
        text: 'Battlecry: Give all enemy creatures -1 Attack.',
        icon: '🐙'
    },

    pri_014: {
        id: 'pri_014',
        name: 'Depths Below',
        faction: Faction.PRIMORDIAL,
        type: CardType.SPELL,
        cost: 3,
        effect: {
            type: 'destroy',
            target: 'target'
        },
        targetType: 'any_creature',
        requiresTarget: true,
        text: 'Destroy a creature with 2 or less Attack.',
        icon: '🌊'
    },

    pri_015: {
        id: 'pri_015',
        name: 'Ichthyosaur',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 5,
        attack: 4,
        health: 4,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🐬'
    },

    pri_016: {
        id: 'pri_016',
        name: 'Primeval Surge',
        faction: Faction.PRIMORDIAL,
        type: CardType.SPELL,
        cost: 4,
        effect: {
            type: 'multiple',
            effects: [
                { type: 'damage', target: 'all_enemies', amount: 1 },
                { type: 'heal', target: 'self_hero', amount: 3 }
            ]
        },
        text: 'Deal 1 damage to all enemies. Restore 3 health to your hero.',
        icon: '🌀'
    },

    pri_017: {
        id: 'pri_017',
        name: 'Elasmosaurus',
        faction: Faction.PRIMORDIAL,
        type: CardType.CREATURE,
        cost: 8,
        attack: 5,
        health: 8,
        keywords: [],
        battlecry: {
            type: 'draw',
            amount: 2
        },
        text: 'Battlecry: Draw 2 cards.',
        icon: '🦕'
    },

    // ============================================
    // ICE AGE FACTION - Armor, resilience, comeback
    // ============================================

    ice_001: {
        id: 'ice_001',
        name: 'Cave Bat',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 1,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦇'
    },

    ice_002: {
        id: 'ice_002',
        name: 'Dire Wolf',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 2,
        keywords: [],
        abilities: [{
            trigger: 'CREATURE_SUMMONED',
            triggerPlayer: 'self',
            effect: {
                type: 'buff',
                target: 'random_friendly',
                attack: 1,
                health: 0
            }
        }],
        text: 'When you summon a creature, give a random friendly creature +1 Attack.',
        icon: '🐺'
    },

    ice_003: {
        id: 'ice_003',
        name: 'Saber-Tooth Tiger',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 3,
        attack: 4,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🐯'
    },

    ice_004: {
        id: 'ice_004',
        name: 'Cave Bear',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 4,
        attack: 3,
        health: 5,
        keywords: ['armored_1'],
        text: 'Armored 1',
        icon: '🐻'
    },

    ice_005: {
        id: 'ice_005',
        name: 'Woolly Rhinoceros',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 5,
        attack: 4,
        health: 5,
        keywords: ['guard', 'armored_1'],
        text: 'Guard. Armored 1',
        icon: '🦏'
    },

    ice_006: {
        id: 'ice_006',
        name: 'Woolly Mammoth',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 7,
        attack: 5,
        health: 8,
        keywords: ['guard', 'armored_2'],
        text: 'Guard. Armored 2',
        icon: '🦣'
    },

    ice_007: {
        id: 'ice_007',
        name: 'Frozen Ground',
        faction: Faction.ICE_AGE,
        type: CardType.SPELL,
        cost: 3,
        effect: {
            type: 'debuff',
            target: 'all_enemies',
            attack: 1,
            health: 0
        },
        text: 'Give all enemy creatures -1 Attack.',
        icon: '❄️'
    },

    ice_008: {
        id: 'ice_008',
        name: 'Survivor\'s Will',
        faction: Faction.ICE_AGE,
        type: CardType.SPELL,
        cost: 4,
        effect: {
            type: 'conditional',
            condition: {
                type: 'health',
                operator: '<=',
                value: 15
            },
            then: {
                type: 'multiple',
                effects: [
                    { type: 'heal', target: 'self_hero', amount: 5 },
                    { type: 'draw', amount: 2 }
                ]
            },
            else: {
                type: 'draw',
                amount: 1
            }
        },
        text: 'If your health is 15 or less, restore 5 health and draw 2 cards. Otherwise, draw 1 card.',
        icon: '💪'
    },

    ice_009: {
        id: 'ice_009',
        name: 'Arctic Fox',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 1,
        attack: 2,
        health: 1,
        keywords: [],
        text: '',
        icon: '🦊'
    },

    ice_010: {
        id: 'ice_010',
        name: 'Giant Sloth',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 3,
        attack: 2,
        health: 5,
        keywords: [],
        text: '',
        icon: '🦥'
    },

    ice_011: {
        id: 'ice_011',
        name: 'Snow Leopard',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 2,
        attack: 3,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🐆'
    },

    ice_012: {
        id: 'ice_012',
        name: 'Mastodon',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 6,
        attack: 5,
        health: 6,
        keywords: ['guard'],
        battlecry: {
            type: 'buff',
            target: 'all_friendly',
            attack: 0,
            health: 2
        },
        text: 'Guard. Battlecry: Give all other friendly creatures +2 Health.',
        icon: '🦣'
    },

    ice_013: {
        id: 'ice_013',
        name: 'Blizzard',
        faction: Faction.ICE_AGE,
        type: CardType.SPELL,
        cost: 5,
        effect: {
            type: 'damage',
            target: 'all_enemies',
            amount: 3
        },
        text: 'Deal 3 damage to all enemy creatures.',
        icon: '🌨️'
    },

    ice_014: {
        id: 'ice_014',
        name: 'Megatherium',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 4,
        attack: 3,
        health: 6,
        keywords: [],
        battlecry: {
            type: 'heal',
            target: 'self_hero',
            amount: 4
        },
        text: 'Battlecry: Restore 4 health to your hero.',
        icon: '🦥'
    },

    ice_015: {
        id: 'ice_015',
        name: 'Frost Armor',
        faction: Faction.ICE_AGE,
        type: CardType.SPELL,
        cost: 2,
        effect: {
            type: 'buff',
            target: 'target',
            attack: 0,
            health: 4
        },
        targetType: 'friendly_creature',
        requiresTarget: true,
        text: 'Give a friendly creature +4 Health.',
        icon: '🛡️'
    },

    ice_016: {
        id: 'ice_016',
        name: 'Cave Lion',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 5,
        attack: 5,
        health: 4,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦁'
    },

    ice_017: {
        id: 'ice_017',
        name: 'Glacial Giant',
        faction: Faction.ICE_AGE,
        type: CardType.CREATURE,
        cost: 8,
        attack: 6,
        health: 9,
        keywords: ['guard', 'armored_2'],
        text: 'Guard. Armored 2',
        icon: '🏔️'
    },

    // ============================================
    // NEUTRAL CARDS - Available to all decks
    // ============================================

    neu_001: {
        id: 'neu_001',
        name: 'Fossil Fragment',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 1,
        attack: 1,
        health: 2,
        keywords: [],
        text: '',
        icon: '🦴'
    },

    neu_002: {
        id: 'neu_002',
        name: 'Stone Sentinel',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 2,
        attack: 1,
        health: 4,
        keywords: ['guard'],
        text: 'Guard',
        icon: '🗿'
    },

    neu_003: {
        id: 'neu_003',
        name: 'Volcanic Eruption',
        faction: Faction.NEUTRAL,
        type: CardType.SPELL,
        cost: 6,
        effect: {
            type: 'damage',
            target: 'all_creatures',
            amount: 4
        },
        text: 'Deal 4 damage to ALL creatures.',
        icon: '🌋'
    },

    neu_004: {
        id: 'neu_004',
        name: 'Pteranodon',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 3,
        attack: 3,
        health: 2,
        keywords: ['charge'],
        text: 'Charge',
        icon: '🦅'
    },

    neu_005: {
        id: 'neu_005',
        name: 'Tar Pit',
        faction: Faction.NEUTRAL,
        type: CardType.SPELL,
        cost: 3,
        effect: {
            type: 'destroy',
            target: 'target'
        },
        targetType: 'any_creature',
        requiresTarget: true,
        text: 'Destroy a creature.',
        icon: '🕳️'
    },

    neu_006: {
        id: 'neu_006',
        name: 'Meteor Strike',
        faction: Faction.NEUTRAL,
        type: CardType.SPELL,
        cost: 4,
        effect: {
            type: 'damage',
            target: 'target',
            amount: 5
        },
        targetType: 'any',
        requiresTarget: true,
        text: 'Deal 5 damage to any target.',
        icon: '☄️'
    },

    neu_007: {
        id: 'neu_007',
        name: 'Wandering Herbivore',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 2,
        attack: 2,
        health: 3,
        keywords: [],
        text: '',
        icon: '🦴'
    },

    neu_008: {
        id: 'neu_008',
        name: 'Pack Hunter',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 3,
        attack: 3,
        health: 2,
        keywords: [],
        battlecry: {
            type: 'summon',
            count: 1,
            creature: {
                name: 'Pack Member',
                attack: 1,
                health: 1,
                keywords: []
            }
        },
        text: 'Battlecry: Summon a 1/1 Pack Member.',
        icon: '🐺'
    },

    neu_009: {
        id: 'neu_009',
        name: 'Ancient Egg',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 1,
        attack: 0,
        health: 3,
        keywords: [],
        extinctEffect: {
            type: 'summon',
            count: 1,
            creature: {
                name: 'Hatchling',
                attack: 3,
                health: 3,
                keywords: []
            }
        },
        text: 'Extinct: Summon a 3/3 Hatchling.',
        icon: '🥚'
    },

    neu_010: {
        id: 'neu_010',
        name: 'Primeval Guardian',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 4,
        attack: 2,
        health: 6,
        keywords: ['guard'],
        text: 'Guard',
        icon: '🗿'
    },

    neu_011: {
        id: 'neu_011',
        name: 'Swift Strike',
        faction: Faction.NEUTRAL,
        type: CardType.SPELL,
        cost: 1,
        effect: {
            type: 'damage',
            target: 'target',
            amount: 2
        },
        targetType: 'any_creature',
        requiresTarget: true,
        text: 'Deal 2 damage to a creature.',
        icon: '⚡'
    },

    neu_012: {
        id: 'neu_012',
        name: 'Apex Predator',
        faction: Faction.NEUTRAL,
        type: CardType.CREATURE,
        cost: 6,
        attack: 6,
        health: 5,
        keywords: [],
        battlecry: {
            type: 'damage',
            target: 'all_enemies',
            amount: 1
        },
        text: 'Battlecry: Deal 1 damage to all enemies.',
        icon: '🦖'
    }
};

/**
 * Get card by ID
 */
export function getCard(cardId) {
    return CARDS[cardId] || null;
}

/**
 * Get all cards of a faction
 */
export function getCardsByFaction(faction) {
    return Object.values(CARDS).filter(card => card.faction === faction);
}

/**
 * Create a starter deck for a faction (50 cards)
 */
export function createStarterDeck(primaryFaction) {
    const deck = [];
    const DECK_SIZE = 50;
    const MAX_COPIES = 2;

    // Get faction cards
    const factionCards = getCardsByFaction(primaryFaction);
    const neutralCards = getCardsByFaction(Faction.NEUTRAL);

    // Add 2 copies of each faction card
    factionCards.forEach(card => {
        for (let i = 0; i < MAX_COPIES; i++) {
            deck.push({ ...card });
        }
    });

    // Add 2 copies of each neutral card
    neutralCards.forEach(card => {
        for (let i = 0; i < MAX_COPIES; i++) {
            deck.push({ ...card });
        }
    });

    // If we have more than DECK_SIZE, trim to size while maintaining good curve
    if (deck.length > DECK_SIZE) {
        // Shuffle and take DECK_SIZE cards
        const shuffled = deck.sort(() => Math.random() - 0.5);
        return shuffled.slice(0, DECK_SIZE);
    }

    // If we need more cards, add extra copies of faction cards
    while (deck.length < DECK_SIZE) {
        // Prioritize low-cost cards for better early game
        const lowCostCards = factionCards.filter(c => c.cost <= 3);
        const midCostCards = factionCards.filter(c => c.cost > 3 && c.cost <= 5);
        const allOptions = [...lowCostCards, ...lowCostCards, ...midCostCards, ...neutralCards];

        if (allOptions.length > 0) {
            const randomCard = allOptions[Math.floor(Math.random() * allOptions.length)];
            deck.push({ ...randomCard });
        } else {
            break;
        }
    }

    // Shuffle the deck
    return deck.sort(() => Math.random() - 0.5).slice(0, DECK_SIZE);
}

/**
 * Create a balanced starter deck mixing factions
 */
export function createBalancedDeck() {
    const deck = [];
    const allCards = Object.values(CARDS);

    // Ensure good mana curve
    const curve = {
        1: 4, // 4 one-drops
        2: 6, // 6 two-drops
        3: 6, // 6 three-drops
        4: 5, // 5 four-drops
        5: 4, // 4 five-drops
        6: 3, // 3 six-drops
        7: 2  // 2 seven+ drops
    };

    Object.entries(curve).forEach(([cost, count]) => {
        const costInt = parseInt(cost);
        const cardsAtCost = costInt < 7
            ? allCards.filter(c => c.cost === costInt)
            : allCards.filter(c => c.cost >= 7);

        for (let i = 0; i < count && cardsAtCost.length > 0; i++) {
            const randomIndex = Math.floor(Math.random() * cardsAtCost.length);
            deck.push({ ...cardsAtCost[randomIndex] });
        }
    });

    return deck;
}
