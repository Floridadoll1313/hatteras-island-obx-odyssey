import React, { useState, useEffect } from 'react';
import { GameState } from './types';
import { calculateTideSync, getInitialState } from './utils/gameLogic';

const SAVE_KEY = 'ocean_tide_surfer_state';
const SYNC_KEY = 'ocean_tide_last_sync';

export const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(getInitialState());
  const [loading, setLoading] = useState(true);

  // ON MOUNT: Load and Sync
  useEffect(() => {
    const loadGame = () => {
      try {
        const savedData = localStorage.getItem(SAVE_KEY);
        const lastSync = localStorage.getItem(SYNC_KEY);
        
        if (savedData) {
          let parsedState = JSON.parse(savedData) as GameState;
          const lastTimestamp = lastSync ? parseInt(lastSync) : Date.now();

          // Apply the real-time offline logic
          const syncedState = calculateTideSync(parsedState, lastTimestamp);
          setGameState(syncedState);
        } else {
          // New Player setup
          setGameState(getInitialState());
        }
      } catch (e) {
        console.error("Failed to recover island state:", e);
      } finally {
        setLoading(false);
      }
    };

    loadGame();
  }, []);

  // ON UPDATE: Persist State and Timestamp
  useEffect(() => {
    if (!loading) {
      localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
      localStorage.setItem(SYNC_KEY, Date.now().toString());
    }
  }, [gameState, loading]);

  if (loading) {
    return <div className="loading-screen">Riding the Wave...</div>;
  }

  return (
    <div className="app-container" style={{ backgroundColor: '#001219', color: '#94D2BD' }}>
      <h1>Ocean Tide Drop AI</h1>
      <div className="stats-bar">
        <span>Harmony: {gameState.playerStats.health}/{gameState.playerStats.maxHealth}</span>
        <span> | </span>
        <span>Sand Dollars: {gameState.sandDollars.toFixed(2)}</span>
      </div>
      
      <main>
        {/* Your Realm and Combat Components go here */}
        <p>{gameState.history[gameState.history.length - 1]}</p>
      </main>
    </div>
  );
};

export default App;
