import { TrumpCardData, TrumpEffectType, TrumpRarity } from '../types';

// Definition Template
interface TrumpDef {
  defId: string;
  name: string;
  description: string;
  rarity: TrumpRarity;
  effectType: TrumpEffectType;
  value: number;
  target: 'SELF' | 'OPPONENT' | 'BOTH';
  icon: string;
  weight: number; // For random generation chance
}

const TRUMP_DEFINITIONS: TrumpDef[] = [
  // --- 1 STAR (COMMON) ---
  {
    defId: 'atk_1',
    name: 'Attack +',
    description: 'Deals +1 damage to opponent if you win this round.',
    rarity: TrumpRarity.COMMON,
    effectType: TrumpEffectType.MODIFY_ATTACK,
    value: 1,
    target: 'SELF',
    icon: '🔪',
    weight: 50
  },
  {
    defId: 'def_1',
    name: 'Shield +',
    description: 'Reduces damage received by 1 if you lose this round.',
    rarity: TrumpRarity.COMMON,
    effectType: TrumpEffectType.MODIFY_DEFENSE,
    value: 1,
    target: 'SELF',
    icon: '🛡️',
    weight: 50
  },

  // --- 2 STAR (UNCOMMON) ---
  {
    defId: 'atk_2',
    name: 'Attack ++',
    description: 'Deals +2 damage to opponent if you win this round.',
    rarity: TrumpRarity.UNCOMMON,
    effectType: TrumpEffectType.MODIFY_ATTACK,
    value: 2,
    target: 'SELF',
    icon: '🔫',
    weight: 25
  },
  {
    defId: 'def_2',
    name: 'Shield ++',
    description: 'Reduces damage received by 2 if you lose this round.',
    rarity: TrumpRarity.UNCOMMON,
    effectType: TrumpEffectType.MODIFY_DEFENSE,
    value: 2,
    target: 'SELF',
    icon: '🧱',
    weight: 25
  },
  {
    defId: 'return_opp_num',
    name: 'Destroy++',
    description: 'Returns the Opponent\'s last dealt number card to the deck.',
    rarity: TrumpRarity.UNCOMMON,
    effectType: TrumpEffectType.REMOVE_LAST_NUMBER,
    value: 0,
    target: 'OPPONENT',
    icon: '💥',
    weight: 15
  },
  {
    defId: 'return_self_num',
    name: 'Recall',
    description: 'Returns YOUR last dealt number card to the deck.',
    rarity: TrumpRarity.UNCOMMON,
    effectType: TrumpEffectType.REMOVE_LAST_NUMBER,
    value: 0,
    target: 'SELF',
    icon: '↩️',
    weight: 15
  },

  // --- 3 STAR (RARE) ---
  {
    defId: 'all_in',
    name: 'ALL IN',
    description: 'Increases Attack by 99 for BOTH sides. One hit kill.',
    rarity: TrumpRarity.RARE,
    effectType: TrumpEffectType.MODIFY_ATTACK,
    value: 99,
    target: 'BOTH',
    icon: '☠️',
    weight: 5
  }
];

export const TrumpCardManager = {
  // Generate a random card based on weights
  drawCard: (): TrumpCardData => {
    const totalWeight = TRUMP_DEFINITIONS.reduce((sum, def) => sum + def.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const def of TRUMP_DEFINITIONS) {
      if (random < def.weight) {
        return {
          id: `trump-${Date.now()}-${Math.random()}`, // Unique instance ID
          definitionId: def.defId,
          name: def.name,
          description: def.description,
          rarity: def.rarity,
          effectType: def.effectType,
          value: def.value,
          target: def.target,
          icon: def.icon
        };
      }
      random -= def.weight;
    }
    // Fallback
    return TrumpCardManager.createFromDef(TRUMP_DEFINITIONS[0]);
  },

  createFromDef: (def: TrumpDef): TrumpCardData => ({
    id: `trump-${Date.now()}-${Math.random()}`,
    definitionId: def.defId,
    name: def.name,
    description: def.description,
    rarity: def.rarity,
    effectType: def.effectType,
    value: def.value,
    target: def.target,
    icon: def.icon
  })
};
