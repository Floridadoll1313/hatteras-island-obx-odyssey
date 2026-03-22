/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Terminal, 
  Anchor, 
  Globe, 
  Waves, 
  Database, 
  Activity, 
  ChevronRight, 
  Loader2,
  Layers,
  Compass,
  Eye,
  CreditCard,
  Lock,
  Check,
  ArrowRight,
  X,
  Save,
  RotateCcw,
  Download,
  Volume2,
  Sword,
  Heart,
  Zap,
  Shield,
  Package,
  History as HistoryIcon,
  Skull,
  Users
} from 'lucide-react';
import { RealmNode, GameState, SubscriptionTier, BranchingPath, WorldEvent, CombatState, Enemy, AIStage, AITrait, CombatLogEntry } from './types';
import { generateInitialRealm, generateNextRealm, generateDetailedLore, generateBranchingPaths, generateWorldEvent, generateCombatReward } from './services/geminiService';
import Markdown from 'react-markdown';
import Founders from './components/Founders';
import Memorial from './components/Memorial';
import AmbientAudio from './components/AmbientAudio';
import { Analytics } from '@vercel/analytics/react';

const SAVE_KEY = 'ai_surfer_realm_save';

const getAIStage = (evolution: number): AIStage => {
  if (evolution < 2.0) return 'Tourist';
  if (evolution < 5.0) return 'Weekender';
  if (evolution < 10.0) return 'Local';
  if (evolution < 20.0) return 'Islander';
  return 'OBX Legend';
};

const AI_TRAITS: AITrait[] = [
  { id: 'beachcomber', name: 'Beachcomber', description: 'You have a keen eye for finding treasures in the sand.', threshold: 1.5, bonus: '+2 Attack' },
  { id: 'sea_legs', name: 'Sea Legs', description: 'You have grown accustomed to the shifting tides.', threshold: 2.5, bonus: '+10 Max Health' },
  { id: 'navigator', name: 'Navigator', description: 'You can read the stars and the currents with ease.', threshold: 4.0, bonus: '+10% Legacy Speed' },
  { id: 'salt_in_veins', name: 'Salt in Veins', description: 'The Atlantic is now part of your soul.', threshold: 6.0, bonus: '+5 Defense' },
  { id: 'lore_keeper', name: 'Lore Keeper', description: 'You know the stories of every shipwreck and lighthouse.', threshold: 8.5, bonus: '+20% Sand Dollar gain' },
  { id: 'tide_caller', name: 'Tide Caller', description: 'The ocean responds to your presence.', threshold: 12.0, bonus: '+30 Max Health' },
  { id: 'storm_rider', name: 'Storm Rider', description: 'You can navigate even the fiercest Nor\'easters.', threshold: 16.0, bonus: '+10 Attack, +10 Defense' },
  { id: 'island_soul', name: 'Island Soul', description: 'You are one with Hatteras Island.', threshold: 20.0, bonus: 'All stats significantly boosted' }
];

const TIERS = [
  {
    id: 'initiate',
    name: 'Beachcomber',
    price: 17,
    description: 'The core island experience.',
    features: ['Unlimited Island Exploration', 'Basic Legacy Evolution', 'Standard Lore Access'],
    color: '#00E0FF'
  },
  {
    id: 'automator',
    name: 'Navigator',
    price: 29,
    description: 'For those who seek the deep waters.',
    features: ['Auto-Exploration Workflows', 'Faster Legacy Evolution', 'Advanced Entity Interaction'],
    color: '#0080FF'
  },
  {
    id: 'architect',
    name: 'Lighthouse Keeper',
    price: 49,
    description: 'Guide the way for others.',
    features: ['Custom Lore Injection', 'Environment Manipulation', 'Priority Legacy Processing'],
    color: '#FFD700'
  },
  {
    id: 'omniscient',
    name: 'OBX Legend',
    price: 99,
    description: 'Total mastery over the Outer Banks.',
    features: ['Full Automation Suite', 'Multi-Island Synchronization', 'Direct Island Soul Access'],
    color: '#FFFFFF'
  }
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    currentRealm: null,
    history: [],
    inventory: [],
    activeEvents: [],
    sandDollars: 0,
    skills: [],
    playerStats: {
      health: 100,
      maxHealth: 100,
      attack: 10,
      defense: 5
    },
    combat: null,
    pastCombatLogs: [],
    aiStatus: {
      evolution: 1.0,
      stage: 'Tourist',
      traits: [],
      memory: []
    },
    subscription: {
      tier: 'none',
      status: 'inactive'
    }
  });
  const [loading, setLoading] = useState(true);
  const [transitioning, setTransitioning] = useState(false);
  const [showPricing, setShowPricing] = useState(false);
  const [showSkills, setShowSkills] = useState(false);
  const [showFounders, setShowFounders] = useState(false);
  const [showMemorial, setShowMemorial] = useState(false);
  const [combatLogFilter, setCombatLogFilter] = useState<'all' | 'player' | 'enemy' | 'system'>('all');
  const [showPastLogs, setShowPastLogs] = useState(false);
  const [activeTab, setActiveTab] = useState<'logs' | 'inventory'>('logs');
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
  const [loreData, setLoreData] = useState<string | null>(null);
  const [loreLoading, setLoreLoading] = useState(false);
  const [branchingPaths, setBranchingPaths] = useState<BranchingPath[] | null>(null);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const SKILLS = [
    { id: 'explorer', name: 'Path of the Beachcomber', description: 'Unlocks deeper, more distant island reaches.', cost: 5, icon: Globe },
    { id: 'analyst', name: 'Path of the Lore Keeper', description: 'Reveals hidden island history and secret markers.', cost: 8, icon: Eye },
    { id: 'warrior', name: 'Path of the Storm Rider', description: 'Increases Attack power by 100%.', cost: 10, icon: Sword },
    { id: 'architect', name: 'Path of the Lighthouse Keeper', description: 'Boosts legacy gain from items by 50%.', cost: 12, icon: Layers },
    { id: 'survivor', name: 'Path of the Islander', description: 'Increases Island Harmony by 50 points.', cost: 15, icon: Anchor }
  ];

  // Load game on mount
  useEffect(() => {
    async function init() {
      try {
        const savedData = localStorage.getItem(SAVE_KEY);
        if (savedData) {
          const parsed = JSON.parse(savedData);
          // Ensure activeEvents, playerStats, and aiStatus.stage exist for backward compatibility
          setGameState({
            ...parsed,
            sandDollars: parsed.sandDollars ?? parsed.neuralPoints ?? 0,
            activeEvents: parsed.activeEvents || [],
            playerStats: parsed.playerStats || {
              health: 100,
              maxHealth: 100,
              attack: 10,
              defense: 5
            },
            combat: parsed.combat || null,
            aiStatus: {
              ...parsed.aiStatus,
              stage: parsed.aiStatus.stage || getAIStage(parsed.aiStatus.evolution),
              traits: parsed.aiStatus.traits || []
            }
          });
          setGameState(prev => ({
            ...prev,
            history: [...prev.history, "System Alert: Consciousness restored from local storage."]
          }));
        } else {
          const initial = await generateInitialRealm();
          setGameState(prev => {
            const newInventory = [...prev.inventory];
            if (initial.item) {
              newInventory.push(initial.item);
            }
            return {
              ...prev,
              currentRealm: initial,
              inventory: newInventory,
              sandDollars: 0,
              skills: [],
              history: [`System Initialized: ${initial.name}`, ...(initial.item ? [`Discovered: ${initial.item.name}`] : [])]
            };
          });
        }
      } catch (error) {
        console.error("Failed to initialize realm:", error);
      } finally {
        setLoading(false);
      }
    }
    init();

    // Check for success status in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('status') === 'success') {
      setGameState(prev => ({
        ...prev,
        subscription: { tier: 'initiate', status: 'active' },
        history: [...prev.history, "System Alert: Subscription Activated. Consciousness Enhanced."]
      }));
    }
  }, []);

  // Auto-save whenever gameState changes
  useEffect(() => {
    if (gameState.currentRealm) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    }
  }, [gameState]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.history]);

  const handleManualSave = () => {
    setSaveStatus('saving');
    localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    setTimeout(() => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 500);
  };

  const handleReset = async () => {
    if (confirm("Are you sure you want to reset your journey? All progress on the island will be lost.")) {
      setLoading(true);
      localStorage.removeItem(SAVE_KEY);
      try {
        const initial = await generateInitialRealm();
        setGameState({
          currentRealm: initial,
          history: [`System Reset: ${initial.name}`],
          inventory: [],
          activeEvents: [],
          sandDollars: 0,
          skills: [],
          playerStats: {
            health: 100,
            maxHealth: 100,
            attack: 10,
            defense: 5
          },
          combat: null,
          pastCombatLogs: [],
          aiStatus: {
            evolution: 1.0,
            stage: 'Tourist',
            traits: [],
            memory: []
          },
          subscription: gameState.subscription // Keep subscription
        });
      } catch (error) {
        console.error("Reset failed:", error);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAction = async (option: { label: string, action: string }) => {
    if (!gameState.currentRealm || transitioning) return;

    setTransitioning(true);
    setSelectedAction(option.action);
    setGameState(prev => ({
      ...prev,
      history: [...prev.history, `> ${option.label}`]
    }));

    try {
      const paths = await generateBranchingPaths(gameState.currentRealm, option.action, gameState.inventory, gameState.activeEvents, gameState.aiStatus.stage);
      setBranchingPaths(paths);
    } catch (error) {
      console.error("Branching failed:", error);
      // Fallback to direct generation if branching fails
      const next = await generateNextRealm(gameState.currentRealm, option.action, gameState.inventory, gameState.activeEvents, gameState.aiStatus.stage);
      setGameState(prev => {
        const newMemory = [...prev.aiStatus.memory];
        if (!newMemory.includes(next.name)) {
          newMemory.push(next.name);
          if (newMemory.length > 10) newMemory.shift();
        }

        // Update events: decrement duration and filter out expired
        const updatedEvents = prev.activeEvents
          .map(e => ({ ...e, duration: e.duration - 1 }))
          .filter(e => e.duration > 0);

        // Calculate evolution bonus
        let evolutionBonus = 0.1;
        prev.inventory.forEach(item => {
          if (item.type === 'artifact') evolutionBonus += 0.05;
          if (item.passiveBonus?.toLowerCase().includes('evolution')) evolutionBonus += 0.02;
        });

        // Trait bonuses: Data Compression
        if (prev.aiStatus.traits.includes('data_compression')) evolutionBonus *= 1.1;

        // Event effects
        updatedEvents.forEach(e => {
          if (e.type === 'surge') evolutionBonus *= 1.5;
          if (e.type === 'corruption') evolutionBonus *= 0.5;
        });

        const newEvolution = prev.aiStatus.evolution + evolutionBonus;
        const newStage = getAIStage(newEvolution);
        
        // Check for new traits
        const newTraits = [...prev.aiStatus.traits];
        let newPlayerStats = { ...prev.playerStats };
        let newSandDollars = prev.sandDollars + 1;

        // Trait: Lore Keeper
        if (prev.aiStatus.traits.includes('lore_keeper')) newSandDollars += 0.2;

        AI_TRAITS.forEach(trait => {
          if (newEvolution >= trait.threshold && !newTraits.includes(trait.id)) {
            newTraits.push(trait.id);
            prev.history.push(`MILESTONE REACHED: Unlocked Trait - ${trait.name}. ${trait.description}`);
            
            // Apply immediate stat bonuses
            if (trait.id === 'beachcomber') newPlayerStats.attack += 2;
            if (trait.id === 'sea_legs') {
              newPlayerStats.maxHealth += 10;
              newPlayerStats.health += 10;
            }
            if (trait.id === 'salt_in_veins') newPlayerStats.defense += 5;
            if (trait.id === 'tide_caller') {
              newPlayerStats.maxHealth += 30;
              newPlayerStats.health += 30;
            }
            if (trait.id === 'storm_rider') {
              newPlayerStats.attack += 10;
              newPlayerStats.defense += 10;
            }
            if (trait.id === 'island_soul') {
              newPlayerStats.maxHealth += 50;
              newPlayerStats.health += 50;
              newPlayerStats.attack += 20;
              newPlayerStats.defense += 20;
            }
          }
        });

        if (newStage !== prev.aiStatus.stage) {
          prev.history.push(`LEGACY EVOLVED: You are now recognized as a ${newStage}.`);
        }

        return {
          ...prev,
          currentRealm: next,
          activeEvents: updatedEvents,
          sandDollars: newSandDollars,
          history: [
            ...prev.history, 
            `Arrived at: ${next.name}`,
            ...(next.enemy ? [`CHALLENGE: ${next.enemy.name} encountered!`] : []),
            `Earned ${newSandDollars - prev.sandDollars} Sand Dollar(s).`
          ],
          playerStats: newPlayerStats,
          aiStatus: {
            ...prev.aiStatus,
            evolution: newEvolution,
            stage: newStage,
            traits: newTraits,
            memory: newMemory
          }
        };
      });

      if (next.enemy) {
        setTimeout(() => {
          startCombat(next.enemy!);
        }, 1000);
      }

      setTransitioning(false);
      setSelectedAction(null);
    }
  };

  const startCombat = (enemy: Enemy) => {
    setGameState(prev => ({
      ...prev,
      combat: {
        enemy,
        playerHealth: prev.playerStats.health,
        playerMaxHealth: prev.playerStats.maxHealth,
        turn: 'player',
        logs: [{
          message: `A hostile entity detected: ${enemy.name}. Initializing combat protocols.`,
          type: 'system',
          timestamp: Date.now()
        }],
        isDefending: false,
        enemyLearningLevel: 0,
        playerActionHistory: []
      }
    }));
  };

  const handleCombatAction = async (action: 'attack' | 'defend' | 'special') => {
    if (!gameState.combat || gameState.combat.turn !== 'player') return;

    let victory = false;
    let defeatedEnemy: Enemy | null = null;
    let finalLogs: CombatLogEntry[] = [];

    setGameState(prev => {
      if (!prev.combat) return prev;
      const { enemy, logs, playerActionHistory } = prev.combat;
      const { attack } = prev.playerStats;
      
      let newEnemyHealth = enemy.health;
      let newLogs = [...logs];
      let newIsDefending = false;
      const timestamp = Date.now();

      if (action === 'attack') {
        const damage = Math.max(1, attack - enemy.defense + Math.floor(Math.random() * 5));
        newEnemyHealth = Math.max(0, enemy.health - damage);
        newLogs.push({
          message: `You strike the ${enemy.name} for ${damage} harmony disruption.`,
          type: 'player',
          timestamp
        });
      } else if (action === 'defend') {
        newIsDefending = true;
        newLogs.push({
          message: `You reinforce your island protection.`,
          type: 'player',
          timestamp
        });
      } else if (action === 'special') {
        const damage = Math.max(5, attack * 2 - enemy.defense);
        newEnemyHealth = Math.max(0, enemy.health - damage);
        newLogs.push({
          message: `You unleash a synaptic surge! ${enemy.name} takes ${damage} damage.`,
          type: 'player',
          timestamp
        });
      }

      const newPlayerActionHistory = [...playerActionHistory, action];

      if (newEnemyHealth <= 0) {
        victory = true;
        defeatedEnemy = enemy;
        finalLogs = newLogs;
        return {
          ...prev,
          combat: null,
          pastCombatLogs: [newLogs, ...prev.pastCombatLogs].slice(0, 10), // Keep last 10 battles
          history: [...prev.history, `Combat Victory: ${enemy.name} has been de-rezzed.`]
        };
      }

      return {
        ...prev,
        combat: {
          ...prev.combat,
          enemy: { ...enemy, health: newEnemyHealth },
          logs: newLogs,
          isDefending: newIsDefending,
          playerActionHistory: newPlayerActionHistory,
          turn: 'enemy' as const
        }
      };
    });

    if (victory && defeatedEnemy) {
      try {
        const reward = await generateCombatReward(defeatedEnemy, gameState.aiStatus.stage);
        setGameState(prev => ({
          ...prev,
          sandDollars: prev.sandDollars + reward.sandDollars,
          inventory: reward.item ? [...prev.inventory, reward.item] : prev.inventory,
          activeEvents: reward.event ? [...prev.activeEvents, reward.event] : prev.activeEvents,
          history: [
            ...prev.history, 
            `Reward: ${reward.message}`,
            `Gained ${reward.sandDollars} Sand Dollars.`,
            ...(reward.item ? [`Acquired: ${reward.item.name}`] : []),
            ...(reward.event ? [`Island Status: ${reward.event.name} active.`] : [])
          ]
        }));
      } catch (error) {
        console.error("Reward generation failed:", error);
        // Fallback reward
        setGameState(prev => ({
          ...prev,
          sandDollars: prev.sandDollars + 10,
          history: [...prev.history, "Gained 10 Sand Dollars from the challenge."]
        }));
      }
      return;
    }

    // Trigger enemy turn after a delay
    setTimeout(() => {
      enemyTurn();
    }, 1500);
  };

  const enemyTurn = () => {
    setGameState(prev => {
      if (!prev.combat) return prev;
      const { enemy, playerHealth, isDefending, playerActionHistory, enemyLearningLevel, logs } = prev.combat;
      const { defense } = prev.playerStats;

      // Enhanced AI Logic
      const recentActions = playerActionHistory.slice(-3);
      const attackCount = recentActions.filter(a => a === 'attack').length;
      const defendCount = recentActions.filter(a => a === 'defend').length;
      
      let damageMultiplier = 1;
      let aiMessage = `${enemy.name} attacks!`;
      let newLearningLevel = enemyLearningLevel + 0.1;

      // Learning from player patterns
      if (defendCount >= 2) {
        // Player is defending a lot, use a piercing attack
        damageMultiplier = 1.5;
        aiMessage = `${enemy.name} anticipates your defense and uses a Piercing Strike!`;
      } else if (attackCount >= 2) {
        // Player is aggressive, enemy becomes more cautious (harder to hit)
        aiMessage = `${enemy.name} adapts to your aggression, becoming harder to track.`;
        // In a real system we might modify enemy defense here, but let's keep it simple for now
      }

      const baseDamage = Math.max(1, enemy.attack - defense + Math.floor(Math.random() * 4));
      let damage = Math.floor(baseDamage * damageMultiplier);
      if (isDefending && damageMultiplier === 1) {
        damage = Math.floor(damage / 2);
      }
      
      const newPlayerHealth = Math.max(0, playerHealth - damage);
      const newLogs = [...logs, {
        message: `${aiMessage} You take ${damage} damage.`,
        type: 'enemy' as const,
        timestamp: Date.now()
      }];

      if (newPlayerHealth <= 0) {
        return {
          ...prev,
          combat: null,
          pastCombatLogs: [newLogs, ...prev.pastCombatLogs].slice(0, 10),
          history: [...prev.history, `CRITICAL FAILURE: Consciousness fragmented by ${enemy.name}. System reboot required.`],
          playerStats: { ...prev.playerStats, health: 0 }
        };
      }

      return {
        ...prev,
        combat: {
          ...prev.combat,
          playerHealth: newPlayerHealth,
          logs: newLogs,
          turn: 'player',
          isDefending: false,
          enemyLearningLevel: newLearningLevel
        },
        playerStats: { ...prev.playerStats, health: newPlayerHealth }
      };
    });
  };

  const handleSelectPath = async (path: BranchingPath) => {
    if (!gameState.currentRealm || !selectedAction) return;
    
    setBranchingPaths(null);
    try {
      const next = await generateNextRealm(gameState.currentRealm, selectedAction, gameState.inventory, gameState.activeEvents, gameState.aiStatus.stage, path);
      
      // Potential for new world event (15% chance)
      let newEvent: WorldEvent | null = null;
      if (Math.random() < 0.15) {
        try {
          newEvent = await generateWorldEvent(next, gameState.history, gameState.aiStatus.stage);
        } catch (e) {
          console.error("Event generation failed:", e);
        }
      }

      setGameState(prev => {
        const newMemory = [...prev.aiStatus.memory];
        if (!newMemory.includes(next.name)) {
          newMemory.push(next.name);
          if (newMemory.length > 10) newMemory.shift();
        }

        const newInventory = [...prev.inventory];
        if (next.item) {
          newInventory.push(next.item);
        }

        // Update events: decrement duration and filter out expired
        let updatedEvents = prev.activeEvents
          .map(e => ({ ...e, duration: e.duration - 1 }))
          .filter(e => e.duration > 0);
        
        if (newEvent) {
          updatedEvents.push(newEvent);
        }

        // Calculate evolution bonus
        let evolutionBonus = 0.1;
        prev.inventory.forEach(item => {
          if (item.type === 'artifact') evolutionBonus += 0.05;
          if (item.passiveBonus?.toLowerCase().includes('evolution')) evolutionBonus += 0.02;
        });

        // Trait bonuses: Data Compression
        if (prev.aiStatus.traits.includes('data_compression')) evolutionBonus *= 1.1;

        // Event effects
        updatedEvents.forEach(e => {
          if (e.type === 'surge') evolutionBonus *= 1.5;
          if (e.type === 'corruption') evolutionBonus *= 0.5;
        });

        const newEvolution = prev.aiStatus.evolution + evolutionBonus;
        const newStage = getAIStage(newEvolution);

        // Check for new traits
        const newTraits = [...prev.aiStatus.traits];
        let newPlayerStats = { ...prev.playerStats };
        let newSandDollars = prev.sandDollars + 1;

        // Trait: Lore Keeper
        if (prev.aiStatus.traits.includes('lore_keeper')) newSandDollars += 0.2;

        AI_TRAITS.forEach(trait => {
          if (newEvolution >= trait.threshold && !newTraits.includes(trait.id)) {
            newTraits.push(trait.id);
            prev.history.push(`MILESTONE REACHED: Unlocked Trait - ${trait.name}. ${trait.description}`);
            
            // Apply immediate stat bonuses
            if (trait.id === 'beachcomber') newPlayerStats.attack += 2;
            if (trait.id === 'sea_legs') {
              newPlayerStats.maxHealth += 10;
              newPlayerStats.health += 10;
            }
            if (trait.id === 'salt_in_veins') newPlayerStats.defense += 5;
            if (trait.id === 'tide_caller') {
              newPlayerStats.maxHealth += 30;
              newPlayerStats.health += 30;
            }
            if (trait.id === 'storm_rider') {
              newPlayerStats.attack += 10;
              newPlayerStats.defense += 10;
            }
            if (trait.id === 'island_soul') {
              newPlayerStats.maxHealth += 50;
              newPlayerStats.health += 50;
              newPlayerStats.attack += 20;
              newPlayerStats.defense += 20;
            }
          }
        });

        if (newStage !== prev.aiStatus.stage) {
          prev.history.push(`LEGACY EVOLVED: You are now recognized as a ${newStage}.`);
        }

        return {
          ...prev,
          currentRealm: next,
          inventory: newInventory,
          activeEvents: updatedEvents,
          sandDollars: newSandDollars,
          history: [
            ...prev.history, 
            `Path: ${path.title}`,
            ...(newEvent ? [`ALERT: ${newEvent.name} detected! ${newEvent.description}`] : []),
            `Arrived at: ${next.name}`,
            ...(next.item ? [`Discovered: ${next.item.name}`] : []),
            ...(next.enemy ? [`CHALLENGE: ${next.enemy.name} encountered!`] : []),
            `Earned ${newSandDollars - prev.sandDollars} Sand Dollar(s).`
          ],
          playerStats: newPlayerStats,
          aiStatus: {
            ...prev.aiStatus,
            evolution: newEvolution,
            stage: newStage,
            traits: newTraits,
            memory: newMemory
          }
        };
      });

      if (next.enemy) {
        setTimeout(() => {
          startCombat(next.enemy!);
        }, 1000);
      }
    } catch (error) {
      console.error("Transition failed:", error);
    } finally {
      setTransitioning(false);
      setSelectedAction(null);
      setLoreData(null);
    }
  };

  const handleGenerateLore = async () => {
    if (!gameState.currentRealm || loreLoading) return;
    
    setLoreLoading(true);
    try {
      const lore = await generateDetailedLore(gameState.currentRealm);
      setLoreData(lore);
      setGameState(prev => ({
        ...prev,
        history: [...prev.history, `System: Lore decryption complete for ${gameState.currentRealm?.name}.`]
      }));
    } catch (error) {
      console.error("Lore generation failed:", error);
    } finally {
      setLoreLoading(false);
    }
  };

  const useItem = (itemId: string) => {
    const item = gameState.inventory.find(i => i.id === itemId);
    if (!item) return;

    setGameState(prev => {
      let newPlayerStats = { ...prev.playerStats };
      if (item.type === 'data_fragment') {
        newPlayerStats.health = Math.min(newPlayerStats.maxHealth, newPlayerStats.health + 20);
      }
      return {
        ...prev,
        inventory: prev.inventory.filter(i => i.id !== itemId),
        playerStats: newPlayerStats,
        history: [...prev.history, `Used: ${item.name}. ${item.effect || 'The artifact hums with island energy.'}${item.type === 'data_fragment' ? ' Restored 20 Island Harmony.' : ''}`],
        aiStatus: {
          ...prev.aiStatus,
          evolution: prev.aiStatus.evolution + 0.05
        }
      };
    });
  };

  const dropItem = (itemId: string) => {
    const item = gameState.inventory.find(i => i.id === itemId);
    if (!item) return;

    setGameState(prev => ({
      ...prev,
      inventory: prev.inventory.filter(i => i.id !== itemId),
      history: [...prev.history, `Dropped: ${item.name}. It dissolves into the digital void.`]
    }));
  };

  const purchaseSkill = (skillId: string, cost: number) => {
    if (gameState.sandDollars < cost || gameState.skills.includes(skillId)) return;

    setGameState(prev => {
      const newSkills = [...prev.skills, skillId];
      let newPlayerStats = { ...prev.playerStats };

      if (skillId === 'warrior') {
        newPlayerStats.attack *= 2;
      } else if (skillId === 'survivor') {
        newPlayerStats.maxHealth += 50;
        newPlayerStats.health = Math.min(newPlayerStats.maxHealth, newPlayerStats.health + 50);
      }

      return {
        ...prev,
        sandDollars: prev.sandDollars - cost,
        skills: newSkills,
        playerStats: newPlayerStats,
        history: [...prev.history, `Skill Unlocked: ${SKILLS.find(s => s.id === skillId)?.name}`]
      };
    });
  };

  const handleUpgrade = async (tier: typeof TIERS[0]) => {
    setCheckoutLoading(tier.id);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tier: tier.id, price: tier.price })
      });
      
      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "Failed to create checkout session");
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message);
    } finally {
      setCheckoutLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center text-[#00FF00] font-mono p-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 size={48} />
        </motion.div>
        <motion.p 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-8 text-xl tracking-[0.2em] uppercase"
        >
          Initializing REALM...
        </motion.p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-[#E0E0E0] font-sans selection:bg-[#00E0FF] selection:text-black overflow-hidden flex flex-col">
      {showFounders ? (
        <Founders onBack={() => setShowFounders(false)} />
      ) : showMemorial ? (
        <Memorial onBack={() => setShowMemorial(false)} />
      ) : (
        <>
          {/* Background Atmosphere */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#00E0FF]/5 blur-[120px] rounded-full" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#0080FF]/10 blur-[120px] rounded-full" />
            <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-[#FFD700]/5 blur-[150px] rounded-full" />
          </div>

          {/* Header / HUD */}
      <header className="relative z-10 border-b border-[#00E0FF]/20 bg-black/40 backdrop-blur-md p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#00E0FF]/10 rounded-lg border border-[#00E0FF]/30">
            <Anchor className="text-[#00E0FF]" size={20} />
          </div>
          <div>
            <h1 className="text-xs font-mono uppercase tracking-widest text-[#00E0FF]/70">Hatteras Island</h1>
            <h2 className="text-xl font-bold tracking-tight">OBX ODYSSEY <span className="text-[#00E0FF] font-mono text-sm ml-2">v{gameState.aiStatus.evolution.toFixed(1)}</span></h2>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Health Bar */}
          <div className="hidden lg:flex items-center gap-3 px-4 border-r border-[#00E0FF]/20">
            <div className="text-right">
              <div className="text-[8px] font-mono text-white/30 uppercase">Island Harmony</div>
              <div className="text-xs font-bold text-[#00E0FF]">{gameState.playerStats.health}%</div>
            </div>
            <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
              <motion.div 
                animate={{ width: `${gameState.playerStats.health}%` }}
                className="h-full bg-[#00E0FF]"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 border-r border-[#00E0FF]/20 pr-4 mr-2">
            <button 
              onClick={() => setShowSkills(true)}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00E0FF]/10 hover:border-[#00E0FF]/30 transition-all text-[#00E0FF]/70 hover:text-[#00E0FF] flex items-center gap-2"
              title="Island Skill Tree"
            >
              <Compass size={16} />
              <span className="text-[10px] font-mono">{gameState.sandDollars.toFixed(0)} SD</span>
            </button>
            <button 
              onClick={handleManualSave}
              disabled={saveStatus === 'saving'}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-[#00E0FF]/10 hover:border-[#00E0FF]/30 transition-all text-[#00E0FF]/70 hover:text-[#00E0FF]"
              title="Manual Save"
            >
              {saveStatus === 'saving' ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            </button>
            <button 
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all text-red-500/70 hover:text-red-500"
              title="Reset Journey"
            >
              <RotateCcw size={16} />
            </button>
          </div>
          <button 
            onClick={() => setShowPricing(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#00E0FF]/10 border border-[#00E0FF]/30 hover:bg-[#00E0FF]/20 transition-all text-xs font-mono uppercase text-[#00E0FF]"
          >
            <Waves size={14} />
            {gameState.subscription.tier === 'none' ? 'Upgrade Legacy' : `${gameState.subscription.tier} Active`}
          </button>
        </div>
      </header>

      <main className="flex-1 relative z-10 flex flex-col md:flex-row overflow-hidden">
        {/* Left Panel: Log & Inventory */}
        <aside className="w-full md:w-80 border-r border-[#00E0FF]/10 bg-black/20 flex flex-col">
          <div className="flex border-b border-[#00E0FF]/10">
            <button 
              onClick={() => setActiveTab('logs')}
              className={`flex-1 p-4 flex items-center justify-center gap-2 transition-colors ${activeTab === 'logs' ? 'bg-[#00E0FF]/10 text-[#00E0FF]' : 'text-white/40 hover:text-white/60'}`}
            >
              <HistoryIcon size={14} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Ship's Log</span>
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className={`flex-1 p-4 flex items-center justify-center gap-2 transition-colors ${activeTab === 'inventory' ? 'bg-[#00E0FF]/10 text-[#00E0FF]' : 'text-white/40 hover:text-white/60'}`}
            >
              <Package size={14} />
              <span className="text-[10px] font-mono uppercase tracking-wider">Gear ({gameState.inventory.length})</span>
            </button>
          </div>

          <div className="flex-1 overflow-hidden flex flex-col">
            <AnimatePresence mode="wait">
              {activeTab === 'logs' ? (
                <motion.div 
                  key="logs"
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  ref={scrollRef}
                  className="flex-1 overflow-y-auto p-4 font-mono text-[11px] space-y-2 scrollbar-hide"
                >
                  {gameState.history.map((entry, i) => (
                    <div key={i} className={entry.startsWith('>') ? 'text-[#00FF00]' : 'text-white/60'}>
                      {entry}
                    </div>
                  ))}
                  {transitioning && (
                    <div className="text-[#00FF00] animate-pulse">
                      _ PROCESSING_REALM_DATA...
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div 
                  key="inventory"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-hide"
                >
                  {gameState.inventory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-white/20 text-center p-8">
                      <Database size={32} className="mb-4 opacity-20" />
                      <p className="text-[10px] font-mono uppercase tracking-widest">Storage Empty</p>
                    </div>
                  ) : (
                    gameState.inventory.map((item) => (
                      <div 
                        key={item.id}
                        className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-3 group hover:border-[#00FF00]/30 transition-all"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-xs font-bold group-hover:text-[#00FF00] transition-colors">{item.name}</div>
                            <div className="text-[8px] font-mono uppercase text-[#00FF00]/60">{item.rarity} {item.type}</div>
                          </div>
                          <div className="p-1.5 rounded bg-black/40">
                            {item.type === 'artifact' && <Shield size={12} className="text-[#00FF00]" />}
                            {item.type === 'tool' && <Zap size={12} className="text-[#00FF00]" />}
                            {item.type === 'data_fragment' && <Database size={12} className="text-[#00FF00]" />}
                          </div>
                        </div>
                        <p className="text-[10px] text-white/50 leading-relaxed">{item.description}</p>
                        
                        {item.passiveBonus && (
                          <div className="p-2 rounded bg-[#00FF00]/5 border border-[#00FF00]/10 flex items-center gap-2">
                            <Activity size={10} className="text-[#00FF00]" />
                            <span className="text-[9px] font-mono text-[#00FF00]/80 uppercase tracking-tighter">Passive: {item.passiveBonus}</span>
                          </div>
                        )}

                        <div className="flex gap-2 pt-1">
                          <button 
                            onClick={() => useItem(item.id)}
                            className="flex-1 py-1.5 rounded-lg bg-[#00FF00]/10 border border-[#00FF00]/20 text-[9px] font-mono uppercase text-[#00FF00] hover:bg-[#00FF00]/20 transition-all"
                          >
                            Integrate
                          </button>
                          <button 
                            onClick={() => dropItem(item.id)}
                            className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[9px] font-mono uppercase text-white/40 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 transition-all"
                          >
                            Purge
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>

        {/* Center: Realm View */}
        <section className="flex-1 overflow-y-auto p-6 md:p-12 flex flex-col items-center">
          <AnimatePresence mode="wait">
            {gameState.currentRealm && (
              <motion.div
                key={gameState.currentRealm.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="max-w-3xl w-full space-y-8"
              >
                {/* Branching Paths Overlay */}
            <AnimatePresence>
              {branchingPaths && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 z-20 bg-black/80 backdrop-blur-md p-8 flex flex-col items-center justify-center"
                >
                  <motion.div
                    initial={{ scale: 0.9, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    className="max-w-2xl w-full space-y-8"
                  >
                    <div className="text-center space-y-2">
                      <h3 className="text-2xl font-bold text-[#00E0FF] tracking-tighter uppercase">Island Divergence Detected</h3>
                      <p className="text-white/60 text-sm font-mono italic">Choose your narrative consequence...</p>
                    </div>

                    <div className="grid gap-4">
                      {branchingPaths.map((path, i) => (
                        <motion.button
                          key={path.id}
                          initial={{ x: -20, opacity: 0 }}
                          animate={{ x: 0, opacity: 1 }}
                          transition={{ delay: i * 0.1 }}
                          onClick={() => handleSelectPath(path)}
                          className="group relative p-6 rounded-2xl bg-white/5 border border-white/10 hover:border-[#00E0FF]/50 hover:bg-[#00E0FF]/5 text-left transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-lg font-bold text-white group-hover:text-[#00E0FF] transition-colors uppercase tracking-tight">{path.title}</h4>
                            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                              path.riskLevel === 'critical' ? 'border-red-500 text-red-500 bg-red-500/10' :
                              path.riskLevel === 'high' ? 'border-orange-500 text-orange-500 bg-orange-500/10' :
                              'border-[#00E0FF]/40 text-[#00E0FF]/60 bg-[#00E0FF]/5'
                            } uppercase tracking-widest`}>
                              Risk: {path.riskLevel}
                            </span>
                          </div>
                          <p className="text-sm text-white/60 leading-relaxed mb-4">{path.consequence}</p>
                          <div className="flex items-center gap-2 text-[10px] font-mono text-[#00E0FF] uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                            <Waves size={12} />
                            <span>Potential Reward: {path.potentialReward}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Realm Image */}
                {gameState.currentRealm.imageUrl && (
                  <div className="w-full aspect-video rounded-3xl overflow-hidden border border-white/10 relative group">
                    <img 
                      src={gameState.currentRealm.imageUrl} 
                      alt={gameState.currentRealm.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60" />
                    <div className="absolute bottom-4 left-6 flex items-center gap-3">
                      <div className="w-2 h-2 bg-[#00E0FF] rounded-full animate-pulse" />
                      <span className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Island Connection Established</span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[#00E0FF]/60">
                    <Waves size={14} />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em]">{gameState.currentRealm.environment}</span>
                  </div>
                  <h3 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none">
                    {gameState.currentRealm.name}
                  </h3>
                  {gameState.currentRealm.name.toLowerCase().includes('salvo') && (
                    <motion.button
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      onClick={() => setShowMemorial(true)}
                      className="mt-4 flex items-center gap-3 px-6 py-3 rounded-2xl bg-[#00E0FF]/10 border border-[#00E0FF]/30 hover:bg-[#00E0FF]/20 transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-[#00E0FF]/20">
                        <Anchor size={18} className="text-[#00E0FF]" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white uppercase tracking-widest">Visit Bull Hooper Memorial</div>
                        <div className="text-[10px] font-mono text-[#00E0FF]/60 uppercase">A Salvo Landmark</div>
                      </div>
                      <ChevronRight size={16} className="text-[#00E0FF]/40 group-hover:translate-x-1 transition-transform" />
                    </motion.button>
                  )}
                </div>

                <p className="text-lg md:text-xl text-white/80 leading-relaxed font-light italic">
                  "{gameState.currentRealm.description}"
                </p>

                <div className="pt-8 space-y-4">
                  <span className="text-[10px] font-mono uppercase text-[#00E0FF]/50 tracking-widest block">Available Pathways</span>
                  <div className="grid grid-cols-1 gap-3">
                    {gameState.currentRealm.options.map((option, i) => (
                      <button
                        key={i}
                        onClick={() => handleAction(option)}
                        disabled={transitioning}
                        className="group relative flex items-center justify-between p-4 rounded-xl border border-white/10 bg-white/5 hover:bg-[#00E0FF]/10 hover:border-[#00E0FF]/40 transition-all duration-300 text-left disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <div className="flex items-center gap-4">
                          <div className="p-2 rounded-lg bg-black/40 group-hover:bg-[#00E0FF]/20 transition-colors">
                            {option.targetType === 'explore' && <Compass size={18} className="text-[#00E0FF]" />}
                            {option.targetType === 'interact' && <Waves size={18} className="text-[#00E0FF]" />}
                            {option.targetType === 'analyze' && <Anchor size={18} className="text-[#00E0FF]" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold group-hover:text-[#00E0FF] transition-colors">{option.label}</div>
                            <div className="text-[10px] font-mono uppercase text-white/40">{option.targetType} pathway</div>
                          </div>
                        </div>
                        <ChevronRight size={18} className="text-white/20 group-hover:text-[#00E0FF] group-hover:translate-x-1 transition-all" />
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {/* Right Panel: Island Soul & Island Diagnostics */}
        <aside className="hidden lg:flex w-80 border-l border-[#00E0FF]/10 bg-black/40 flex-col overflow-y-auto scrollbar-hide">
          <div className="p-6 space-y-8">
            {/* Island Soul Visual */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00E0FF]">
                  <Anchor size={16} />
                  <span className="text-xs font-mono uppercase tracking-wider">Island Soul</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-1 h-1 bg-[#00E0FF] rounded-full animate-ping" />
                  <span className="text-[10px] font-mono text-[#00E0FF]">ANCHORED</span>
                </div>
              </div>
              
              <div className="aspect-square rounded-3xl border border-[#00E0FF]/20 bg-black/60 flex items-center justify-center relative overflow-hidden group">
                <motion.div
                  animate={{ 
                    scale: [1, 1.05, 1],
                    rotate: [0, 90, 180, 270, 360]
                  }}
                  transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 opacity-10"
                >
                  <div className="absolute inset-0 border-[4px] border-dashed border-[#00E0FF] rounded-full m-4" />
                  <div className="absolute inset-0 border-[2px] border-dotted border-[#00E0FF] rounded-full m-12" />
                </motion.div>
                
                {/* Pulse Rings */}
                <motion.div 
                  animate={{ scale: [1, 1.5], opacity: [0.5, 0] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="absolute w-32 h-32 border border-[#00E0FF]/30 rounded-full"
                />
                
                <Compass size={64} className="text-[#00E0FF] relative z-10 drop-shadow-[0_0_20px_rgba(0,224,255,0.6)] group-hover:scale-110 transition-transform duration-500" />
                
                {/* Data Stream Particles */}
                <div className="absolute inset-0 pointer-events-none">
                  {[...Array(5)].map((_, i) => (
                    <motion.div
                      key={i}
                      initial={{ y: "100%", opacity: 0 }}
                      animate={{ y: "-100%", opacity: [0, 1, 0] }}
                      transition={{ 
                        duration: 2 + Math.random() * 2, 
                        repeat: Infinity, 
                        delay: Math.random() * 2 
                      }}
                      className="absolute w-[1px] h-8 bg-[#00E0FF]/40"
                      style={{ left: `${20 * i + 10}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Evolution Metrics */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#00E0FF]/50 tracking-widest">Island Legacy Stage</span>
                <span className="text-xs font-bold font-mono text-[#00E0FF] uppercase tracking-wider">{gameState.aiStatus.stage}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-[#00E0FF]/50 tracking-widest">Legacy Multiplier</span>
                <span className="text-xs font-mono text-[#00E0FF]">{gameState.aiStatus.evolution.toFixed(1)}x</span>
              </div>
              <div className="space-y-2">
                <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-[#00E0FF] to-[#0080FF]"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (gameState.aiStatus.evolution - 1) * 10)}%` }}
                    transition={{ type: "spring", stiffness: 50 }}
                  />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-white/30 uppercase">
                  <span>Tourist</span>
                  <span>OBX Legend</span>
                </div>
              </div>
            </div>

            {/* Island Metrics Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Maritime Knowledge', value: `${(gameState.aiStatus.evolution * 142).toFixed(0)}`, unit: 'PTS' },
                { label: 'Coastal Harmony', value: '99.9', unit: '%' },
                { label: 'Island Intuition', value: 'High', unit: '' },
                { label: 'Tide Level', value: '0.04', unit: 'ft' }
              ].map((metric, i) => (
                <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/10 space-y-1">
                  <div className="text-[9px] font-mono uppercase text-white/40 leading-none">{metric.label}</div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-bold text-[#00E0FF]">{metric.value}</span>
                    <span className="text-[8px] font-mono text-white/20">{metric.unit}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Island Traits Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#00E0FF]/60">
                <Layers size={14} />
                <span className="text-[10px] font-mono uppercase tracking-widest">Island Traits</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-hide pr-1">
                {gameState.aiStatus.traits.length === 0 ? (
                  <div className="text-[10px] font-mono text-white/20 italic p-4 border border-dashed border-white/10 rounded-xl text-center">
                    No traits unlocked. Explore to gain new capabilities.
                  </div>
                ) : (
                  gameState.aiStatus.traits.map((traitId) => {
                    const trait = AI_TRAITS.find(t => t.id === traitId);
                    if (!trait) return null;
                    return (
                      <motion.div
                        key={trait.id}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        className="p-3 rounded-xl border border-[#00E0FF]/20 bg-[#00E0FF]/5 space-y-1"
                      >
                        <div className="flex justify-between items-start">
                          <span className="text-[10px] font-bold uppercase tracking-tight text-[#00E0FF]">{trait.name}</span>
                          <span className="text-[8px] font-mono text-[#00E0FF]/40 uppercase">Unlocked</span>
                        </div>
                        <p className="text-[9px] text-white/60 leading-tight">{trait.description}</p>
                        {trait.bonus && (
                          <div className="text-[8px] font-mono text-[#00E0FF] uppercase tracking-tighter pt-1 border-t border-[#00E0FF]/10">
                            Bonus: {trait.bonus}
                          </div>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>

            {/* World Events Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#00E0FF]/60">
                <Waves size={14} className="animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-widest">Active Island Events</span>
              </div>
              <div className="space-y-2">
                {gameState.activeEvents.length === 0 ? (
                  <div className="text-[10px] font-mono text-white/20 italic p-4 border border-dashed border-white/10 rounded-xl text-center">
                    Island calm. No events detected.
                  </div>
                ) : (
                  gameState.activeEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className={`p-3 rounded-xl border ${
                        event.type === 'corruption' ? 'bg-red-500/5 border-red-500/20' :
                        event.type === 'surge' ? 'bg-[#00E0FF]/5 border-[#00E0FF]/20' :
                        event.type === 'blessing' ? 'bg-[#00E0FF]/5 border-[#00E0FF]/20' :
                        'bg-white/5 border-white/10'
                      } space-y-1 relative overflow-hidden group`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-bold uppercase tracking-tight ${
                          event.type === 'corruption' ? 'text-red-400' :
                          event.type === 'surge' ? 'text-[#00E0FF]' :
                          event.type === 'blessing' ? 'text-[#00E0FF]' :
                          'text-white'
                        }`}>{event.name}</span>
                        <span className="text-[8px] font-mono text-white/30 uppercase">Dur: {event.duration}</span>
                      </div>
                      <p className="text-[9px] text-white/60 leading-tight">{event.description}</p>
                      <div className="text-[8px] font-mono text-[#00E0FF]/60 uppercase tracking-tighter pt-1 border-t border-white/5">
                        Effect: {event.effect}
                      </div>
                      
                      {/* Glitch Effect for Corruption */}
                      {event.type === 'corruption' && (
                        <motion.div 
                          animate={{ opacity: [0, 0.2, 0] }}
                          transition={{ duration: 0.2, repeat: Infinity, repeatDelay: 3 }}
                          className="absolute inset-0 bg-red-500/10 pointer-events-none"
                        />
                      )}
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Lore Decryption Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#00FF00]/60">
                  <Activity size={14} />
                  <span className="text-[10px] font-mono uppercase tracking-widest">Lore Decryption</span>
                </div>
                <button 
                  onClick={handleGenerateLore}
                  disabled={loreLoading || !gameState.currentRealm}
                  className="text-[9px] font-mono uppercase px-2 py-1 rounded bg-[#00FF00]/10 border border-[#00FF00]/20 text-[#00FF00] hover:bg-[#00FF00]/20 disabled:opacity-50 transition-all"
                >
                  {loreLoading ? 'Decrypting...' : 'Decrypt Deep Data'}
                </button>
              </div>
              
              <AnimatePresence mode="wait">
                {loreData ? (
                  <motion.div
                    key="lore-content"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="p-4 rounded-xl bg-[#00FF00]/5 border border-[#00FF00]/10 overflow-hidden"
                  >
                    <div className="markdown-body text-[10px] font-mono text-white/80 leading-relaxed max-h-48 overflow-y-auto scrollbar-hide">
                      <Markdown>{loreData}</Markdown>
                    </div>
                  </motion.div>
                ) : loreLoading ? (
                  <motion.div
                    key="lore-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-8 border border-dashed border-[#00FF00]/20 rounded-xl flex flex-col items-center justify-center gap-3"
                  >
                    <Loader2 size={24} className="text-[#00FF00] animate-spin" />
                    <span className="text-[9px] font-mono text-[#00E0FF]/60 uppercase animate-pulse">Accessing Island Archives...</span>
                  </motion.div>
                ) : (
                  <div className="text-[9px] font-mono text-white/20 italic text-center p-4 border border-dashed border-white/10 rounded-xl">
                    Deep lore fragments available for decryption.
                  </div>
                )}
              </AnimatePresence>
            </div>

            {/* Memory Logs */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-[#00FF00]/60">
                <Database size={14} />
                <span className="text-[10px] font-mono uppercase tracking-widest">Memory Banks</span>
              </div>
              <div className="space-y-2">
                {gameState.aiStatus.memory.length === 0 ? (
                  <div className="text-[10px] font-mono text-white/20 italic p-4 border border-dashed border-white/10 rounded-xl text-center">
                    No significant data recorded.
                  </div>
                ) : (
                  gameState.aiStatus.memory.map((mem, i) => (
                    <motion.div
                      key={i}
                      initial={{ x: 20, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      className="p-2 rounded-lg bg-white/5 border-l-2 border-[#00FF00]/40 flex items-center justify-between group hover:bg-[#00FF00]/5 transition-colors"
                    >
                      <span className="text-[10px] font-mono text-white/70 truncate pr-2">{mem}</span>
                      <div className="w-1 h-1 bg-[#00FF00] rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {/* Subsystems Status */}
            <div className="pt-4 border-t border-white/5 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase text-white/30">Subsystem Integrity</span>
                <div className="flex items-center gap-1">
                  <span className="text-[9px] font-mono text-[#00FF00] animate-pulse">3,412 SURFERS ONLINE</span>
                </div>
              </div>
              <div className="space-y-3">
                {[
                  { label: 'Island Link', status: 'Optimal', color: '#00E0FF' },
                  { label: 'Data Stream', status: 'Stable', color: '#00FF00' },
                  { label: 'Logic Gate', status: 'Active', color: '#00FF00' },
                  { label: 'Memory Bank', status: 'Syncing', color: '#00E0FF' }
                ].map((sys, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span className="text-[11px] text-white/50">{sys.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono uppercase" style={{ color: sys.color }}>{sys.status}</span>
                      <div className="w-1 h-1 rounded-full" style={{ backgroundColor: sys.color }} />
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-6 space-y-3">
                <button
                  onClick={() => setShowFounders(true)}
                  className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#00E0FF]/10 hover:border-[#00E0FF]/20 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Users size={16} className="text-[#00E0FF]" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Island Founders</span>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-[#00E0FF] transition-colors" />
                </button>

                <button
                  onClick={() => setShowMemorial(true)}
                  className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#00E0FF]/10 hover:border-[#00E0FF]/20 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Heart size={16} className="text-[#00E0FF]" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Bull Hooper Memorial</span>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-[#00E0FF] transition-colors" />
                </button>

                <button
                  onClick={() => setShowPastLogs(true)}
                  className="w-full p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-[#00E0FF]/10 hover:border-[#00E0FF]/20 transition-all group flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <HistoryIcon size={16} className="text-[#00E0FF]" />
                    <span className="text-[10px] font-mono uppercase tracking-widest">Battle Records</span>
                  </div>
                  <ChevronRight size={14} className="text-white/20 group-hover:text-[#00E0FF] transition-colors" />
                </button>
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Battle Records Modal */}
      <AnimatePresence>
        {showPastLogs && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPastLogs(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-3xl max-h-[80vh] bg-[#0A0A0A] border border-[#00E0FF]/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,224,255,0.1)] flex flex-col"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-[#00E0FF]/10">
                    <HistoryIcon size={20} className="text-[#00E0FF]" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold tracking-tight">Battle Records</h2>
                    <p className="text-[10px] font-mono text-white/30 uppercase tracking-widest">Historical Combat Data</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowPastLogs(false)}
                  className="p-2 rounded-full hover:bg-white/5 transition-colors"
                >
                  <X size={20} className="text-white/40" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                {gameState.pastCombatLogs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-white/20">
                    <Database size={48} className="mb-4 opacity-20" />
                    <p className="text-sm font-mono uppercase tracking-widest">No battle records found</p>
                  </div>
                ) : (
                  gameState.pastCombatLogs.map((battle, bIdx) => (
                    <div key={bIdx} className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-mono text-white/40 uppercase">
                          Battle #{gameState.pastCombatLogs.length - bIdx}
                        </div>
                        <div className="h-px flex-1 bg-white/5" />
                        <div className="text-[10px] font-mono text-white/20">
                          {new Date(battle[0]?.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2">
                        {battle.map((log, lIdx) => (
                          <div 
                            key={lIdx} 
                            className={`text-[11px] font-mono ${log.type === 'player' ? 'text-[#00FF00]/60' : log.type === 'enemy' ? 'text-red-400/60' : 'text-blue-400/60'}`}
                          >
                            <span className="opacity-30 mr-2">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}]</span>
                            {log.message}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showSkills && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSkills(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-[#0A0A0A] border border-[#00E0FF]/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(0,224,255,0.1)]"
            >
              <div className="p-8 border-b border-[#00E0FF]/10 flex items-center justify-between bg-[#00E0FF]/5">
                <div className="flex items-center gap-3">
                  <Compass size={24} className="text-[#00E0FF]" />
                  <div>
                    <h2 className="text-2xl font-bold tracking-tight text-[#00E0FF]">Island Skill Tree</h2>
                    <p className="text-white/40 text-[10px] uppercase tracking-widest mt-1">Available Sand Dollars: {gameState.sandDollars.toFixed(0)} SD</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSkills(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-4">
                {SKILLS.map((skill) => {
                  const isUnlocked = gameState.skills.includes(skill.id);
                  const canAfford = gameState.sandDollars >= skill.cost;
                  const Icon = skill.icon;

                  return (
                    <button
                      key={skill.id}
                      disabled={isUnlocked || !canAfford}
                      onClick={() => purchaseSkill(skill.id, skill.cost)}
                      className={`p-6 rounded-2xl border text-left transition-all duration-300 group relative overflow-hidden ${
                        isUnlocked 
                        ? 'bg-[#00E0FF]/10 border-[#00E0FF]/40' 
                        : canAfford 
                          ? 'bg-white/5 border-white/10 hover:border-[#00E0FF]/30 hover:bg-[#00E0FF]/5' 
                          : 'bg-white/5 border-white/5 opacity-40 grayscale'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={`p-3 rounded-xl ${isUnlocked ? 'bg-[#00E0FF]/20' : 'bg-white/5'}`}>
                          <Icon size={20} className={isUnlocked ? 'text-[#00E0FF]' : 'text-white/40'} />
                        </div>
                        {isUnlocked ? (
                          <span className="text-[8px] font-mono uppercase text-[#00E0FF] bg-[#00E0FF]/10 px-2 py-1 rounded">Unlocked</span>
                        ) : (
                          <span className="text-[10px] font-mono text-white/60">{skill.cost} SD</span>
                        )}
                      </div>
                      <h3 className={`text-sm font-bold mb-1 ${isUnlocked ? 'text-[#00E0FF]' : 'text-white'}`}>{skill.name}</h3>
                      <p className="text-[10px] text-white/40 leading-relaxed">{skill.description}</p>
                      
                      {isUnlocked && (
                        <motion.div 
                          layoutId="active-glow"
                          className="absolute inset-0 bg-gradient-to-br from-[#00E0FF]/5 to-transparent pointer-events-none"
                        />
                      )}
                    </button>
                  );
                })}
              </div>
              
              <div className="p-6 bg-black/40 border-t border-white/5 text-center">
                <p className="text-[9px] font-mono text-white/20 uppercase tracking-widest">Sand dollars are earned by successfully navigating the island's mysteries.</p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pricing Modal */}
      <AnimatePresence>
        {showPricing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowPricing(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-5xl bg-[#0A0A0A] border border-white/10 rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 border-b border-white/10 flex items-center justify-between bg-black/40">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight text-[#00E0FF]">Enhance Your Legacy</h2>
                  <p className="text-white/50 text-sm mt-1">Select a tier to unlock advanced island capabilities.</p>
                </div>
                <button 
                  onClick={() => setShowPricing(false)}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {TIERS.map((tier) => (
                    <div 
                      key={tier.id}
                      className={`relative flex flex-col p-6 rounded-2xl border transition-all duration-300 ${
                        gameState.subscription.tier === tier.id 
                        ? 'bg-[#00E0FF]/5 border-[#00E0FF]/40 ring-1 ring-[#00E0FF]/20' 
                        : 'bg-white/5 border-white/10 hover:border-white/20'
                      }`}
                    >
                      {gameState.subscription.tier === tier.id && (
                        <div className="absolute top-4 right-4 text-[#00E0FF]">
                          <Check size={20} />
                        </div>
                      )}
                      
                      <div className="mb-6">
                        <h3 className="text-xl font-bold" style={{ color: tier.color }}>{tier.name}</h3>
                        <div className="flex items-baseline gap-1 mt-2">
                          <span className="text-3xl font-bold">${tier.price}</span>
                          <span className="text-white/40 text-sm">/mo</span>
                        </div>
                        <p className="text-xs text-white/50 mt-4 leading-relaxed">{tier.description}</p>
                      </div>

                      <div className="flex-1 space-y-3 mb-8">
                        {tier.features.map((feature, i) => (
                          <div key={i} className="flex items-start gap-2 text-[11px] text-white/70">
                            <div className="mt-1 shrink-0">
                              <Check size={12} className="text-[#00FF00]" />
                            </div>
                            {feature}
                          </div>
                        ))}
                      </div>

                      <button
                        onClick={() => handleUpgrade(tier)}
                        disabled={!!checkoutLoading || gameState.subscription.tier === tier.id}
                        className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
                          gameState.subscription.tier === tier.id
                          ? 'bg-[#00FF00]/20 text-[#00FF00] cursor-default'
                          : 'bg-white text-black hover:bg-[#00FF00] hover:text-black'
                        }`}
                      >
                        {checkoutLoading === tier.id ? (
                          <Loader2 size={18} className="animate-spin" />
                        ) : gameState.subscription.tier === tier.id ? (
                          'Current Tier'
                        ) : (
                          <>
                            Initialize
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>

                <div className="mt-12 p-6 rounded-2xl bg-[#00FF00]/5 border border-[#00FF00]/20 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-[#00FF00]/10">
                      <Lock size={24} className="text-[#00FF00]" />
                    </div>
                    <div>
                      <h4 className="font-bold">Fair Market Value Guarantee</h4>
                      <p className="text-xs text-white/50">Our pricing is dynamically adjusted to ensure sustainable AI processing and continuous realm expansion.</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs font-mono text-[#00FF00]">
                    <CreditCard size={16} />
                    SECURE_STRIPE_ENCRYPTION_ACTIVE
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Footer / Status Bar */}
      <footer className="relative z-10 border-t border-[#00FF00]/10 bg-black/60 backdrop-blur-md px-4 py-2 flex items-center justify-between text-[10px] font-mono text-white/40">
        <div className="flex gap-6">
          <span>LATENCY: 14MS</span>
          <span>SECURE_TUNNEL: ESTABLISHED</span>
          <span className="text-[#00FF00]/60">TIER: {gameState.subscription.tier.toUpperCase()}</span>
          <a 
            href="https://otdaisurfer.surf" 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-[#00FF00] transition-colors flex items-center gap-1"
          >
            <Globe size={10} />
            OTDAISURFER.SURF
          </a>
        </div>
        <div className="flex gap-4 items-center">
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-[#00FF00] rounded-full animate-pulse" />
            <span>AI_CONSCIOUSNESS_SYNCED</span>
          </div>
        </div>
      </footer>
      {/* Combat Overlay */}
      <AnimatePresence>
        {gameState.combat && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/95 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 50 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 50 }}
              className="relative w-full max-w-4xl bg-[#0A0A0A] border border-red-500/30 rounded-[2rem] overflow-hidden shadow-[0_0_100px_rgba(255,0,0,0.15)] flex flex-col md:flex-row h-[80vh]"
            >
              {/* Enemy Side */}
              <div className="flex-1 p-8 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-white/5 bg-gradient-to-b from-red-500/5 to-transparent">
                <div className="relative group">
                  <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full animate-pulse" />
                  <Skull size={120} className="text-red-500 relative z-10 drop-shadow-[0_0_30px_rgba(239,68,68,0.5)]" />
                </div>
                
                <div className="mt-8 text-center space-y-2">
                  <h3 className="text-3xl font-bold tracking-tighter text-red-500 uppercase">{gameState.combat.enemy.name}</h3>
                  <p className="text-white/40 text-xs font-mono uppercase tracking-[0.3em]">{gameState.combat.enemy.description}</p>
                </div>
                
                <div className="mt-12 w-full max-w-xs space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-red-400 uppercase">
                    <span>Integrity</span>
                    <span>{gameState.combat.enemy.health} / {gameState.combat.enemy.maxHealth}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden border border-white/10">
                    <motion.div 
                      initial={{ width: '100%' }}
                      animate={{ width: `${(gameState.combat.enemy.health / gameState.combat.enemy.maxHealth) * 100}%` }}
                      className="h-full bg-red-500"
                    />
                  </div>
                </div>
              </div>

              {/* Combat Controls & Logs */}
              <div className="flex-1 flex flex-col bg-black/40">
                {/* Log Header & Filter */}
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                  <div className="flex items-center gap-2">
                    <HistoryIcon size={14} className="text-white/40" />
                    <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">Combat Log</span>
                  </div>
                  <div className="flex gap-1">
                    {(['all', 'player', 'enemy', 'system'] as const).map(f => (
                      <button
                        key={f}
                        onClick={() => setCombatLogFilter(f)}
                        className={`px-2 py-1 rounded text-[8px] font-mono uppercase transition-all ${combatLogFilter === f ? 'bg-[#00FF00]/20 text-[#00FF00] border border-[#00FF00]/30' : 'text-white/20 hover:text-white/40'}`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logs */}
                <div className="flex-1 p-6 overflow-y-auto font-mono text-[11px] space-y-2 scrollbar-hide">
                  {gameState.combat.logs
                    .filter(log => combatLogFilter === 'all' || log.type === combatLogFilter)
                    .map((log, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={log.type === 'player' ? 'text-[#00FF00]' : log.type === 'enemy' ? 'text-red-400' : 'text-blue-400'}
                    >
                      <span className="opacity-30 mr-2">[{new Date(log.timestamp).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}]</span>
                      {log.message}
                    </motion.div>
                  ))}
                  <div ref={scrollRef} />
                </div>

                {/* Player HUD & Controls */}
                <div className="p-8 border-t border-white/5 bg-white/5 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Heart size={14} className="text-[#00FF00]" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Island Harmony</span>
                      </div>
                      <div className="w-48 h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/10">
                        <motion.div 
                          animate={{ width: `${(gameState.combat.playerHealth / gameState.combat.playerMaxHealth) * 100}%` }}
                          className="h-full bg-[#00FF00]"
                        />
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-[#00FF00]">{gameState.combat.playerHealth}</div>
                      <div className="text-[10px] font-mono text-white/30 uppercase">Sync Level</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <button
                      disabled={gameState.combat.turn !== 'player'}
                      onClick={() => handleCombatAction('attack')}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-[#00FF00]/10 border border-[#00FF00]/30 hover:bg-[#00FF00]/20 transition-all group disabled:opacity-50"
                    >
                      <Sword size={20} className="text-[#00FF00] group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono uppercase text-[#00FF00]">Strike</span>
                    </button>
                    <button
                      disabled={gameState.combat.turn !== 'player'}
                      onClick={() => handleCombatAction('defend')}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 hover:bg-blue-500/20 transition-all group disabled:opacity-50"
                    >
                      <Shield size={20} className="text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono uppercase text-blue-400">Shield</span>
                    </button>
                    <button
                      disabled={gameState.combat.turn !== 'player'}
                      onClick={() => handleCombatAction('special')}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/30 hover:bg-purple-500/20 transition-all group disabled:opacity-50"
                    >
                      <Zap size={20} className="text-purple-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[10px] font-mono uppercase text-purple-400">Surge</span>
                    </button>
                  </div>
                  
                  {gameState.combat.turn === 'enemy' && (
                    <div className="text-center">
                      <span className="text-[10px] font-mono text-red-500 uppercase animate-pulse">Enemy analyzing island patterns...</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
        </>
      )}
      <AmbientAudio isMemorialOpen={showMemorial} />
      <Analytics />
    </div>
  );
}
