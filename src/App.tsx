import React, { useState, useEffect } from 'react';
import { GameState, SubscriptionTier } from './types';
import { calculateTideSync, getInitialState } from './utils/gameLogic';
import { SubscriptionDashboard } from './components/SubscriptionDashboard';

// Storage keys for persistence
const SAVE_KEY = 'ocean_tide_surfer_state';
const SYNC_KEY = 'ocean_tide_last_sync';

export const App: React.FC = () => {
  // 1. State Management
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [loading, setLoading] = useState(true);

  // 2. Initialization & Tide Sync (Run once on Mount)
  useEffect(() => {
    const initIsland = () => {
      try {
        const savedData = localStorage.getItem(SAVE_KEY);
        const lastSync = localStorage.getItem(SYNC_KEY);
        
        if (savedData) {
          let parsedState = JSON.parse(savedData) as GameState;
          const lastTimestamp = lastSync ? parseInt(lastSync) : Date.now();

          // Calculate passive gains since the user last closed the app
          const syncedState = calculateTideSync(parsedState, lastTimestamp);
          setGameState(syncedState);
        } else {
          // Initialize fresh state for new surfers
          setGameState(getInitialState());
        }
      } catch (error) {
        console.error("Ocean Current Error: Failed to restore state.", error);
      } finally {
        setLoading(false);
      }
    };

    initIsland();
  }, []);

  // 3. Auto-Save & Timestamp Persistence
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
      localStorage.setItem(SYNC_KEY, Date.now().toString());
    }
  }, [gameState, loading]);

  // 4. Handlers
  const handleUpgrade = (tier: SubscriptionTier) => {
    console.log(`Redirecting to Stripe for ${tier} membership...`);
    // This will eventually call your FARM stack backend /create-checkout-session
    alert(`Initiating ${tier} upgrade ($17.00/mo)`);
  };

  // 5. Render Logic
  if (loading) {
    return (
      <div style={{ 
        height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#001219', color: '#94D2BD', fontFamily: 'sans-serif' 
      }}>
        <h2>Riding the Wave...</h2>
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', backgroundColor: '#001219', color: '#E9D8A6', 
      fontFamily: 'Segoe UI, Tahoma, Geneva, Verdana, sans-serif', padding: '20px'
    }}>
      {/* Header Section */}
      <header style={{ borderBottom: '2px solid #005F73', paddingBottom: '20px', marginBottom: '30px' }}>
        <h1 style={{ color: '#94D2BD', margin: 0 }}>Ocean Tide Drop AI</h1>
        <p style={{ color: '#0A9396', fontSize: '1.1rem' }}>Evolution Stage: {gameState.aiStatus.stage}</p>
      </header>

      {/* Stats Dashboard */}
      <div style={{ 
        display: 'flex', gap: '20px', marginBottom: '30px', flexWrap: 'wrap' 
      }}>
        <div style={{ background: '#005F73', padding: '15px', borderRadius: '8px', minWidth: '150px' }}>
          <small>HARMONY</small>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {gameState.playerStats.health} / {gameState.playerStats.maxHealth}
          </div>
        </div>
        <div style={{ background: '#005F73', padding: '15px', borderRadius: '8px', minWidth: '150px' }}>
          <small>SAND DOLLARS</small>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#EE9B00' }}>
            {gameState.sandDollars.toFixed(2)}
          </div>
        </div>
        <div style={{ background: '#005F73', padding: '15px', borderRadius: '8px', minWidth: '150px' }}>
          <small>AI EVOLUTION</small>
          <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
            {gameState.aiStatus.evolution}%
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
        
        {/* Left Column: World & Interaction */}
        <section>
          <div style={{ background: '#0A9396', padding: '20px', borderRadius: '12px', marginBottom: '20px' }}>
            <h3>Current Realm: {gameState.currentRealm?.name || 'The Digital Shore'}</h3>
            <p>{gameState.currentRealm?.description || 'Your journey begins where the code meets the sand.'}</p>
            <button style={{ 
              padding: '10px 20px', backgroundColor: '#EE9B00', border: 'none', 
              borderRadius: '5px', fontWeight: 'bold', cursor: 'pointer' 
            }}>
              Explore Horizon
            </button>
          </div>

          <div style={{ background: '#001219', border: '1px solid #005F73', padding: '15px', borderRadius: '8px' }}>
            <h4>Ship's Log</h4>
            <div style={{ height: '150px', overflowY: 'auto', fontSize: '0.9rem', color: '#94D2BD' }}>
              {gameState.history.map((entry, index) => (
                <p key={index} style={{ borderBottom: '1px solid #002129', padding: '4px 0' }}>
                  {entry}
                </p>
              ))}
            </div>
          </div>
        </section>

        {/* Right Column: Membership & Tiers */}
        <aside>
          <SubscriptionDashboard 
            gameState={gameState} 
            onUpgrade={handleUpgrade} 
          />
        </aside>

      </div>

      {/* Footer Branding */}
      <footer style={{ marginTop: '50px', textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
        Ocean Tide Drop AI Solutions © 2026 | OBX Legend Protocol Active
      </footer>
    </div>
  );
};

export default App;
