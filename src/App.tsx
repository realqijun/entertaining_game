import { useCallback, useState } from 'react';
import { newGame } from './engine/sim';
import type { GameState, RunConfig } from './engine/types';
import { dailyConfig, loadMeta, loadSave, saveMeta, todayKey, writeSave, type Meta } from './meta';
import { Game } from './ui/Game';
import { Legacy, MainMenu, Setup } from './ui/Menus';

type Screen = { id: 'menu' } | { id: 'setup' } | { id: 'legacy' } | { id: 'game'; state: GameState; key: number };

export default function App() {
  const [meta, setMeta] = useState<Meta>(() => loadMeta());
  const [screen, setScreen] = useState<Screen>({ id: 'menu' });
  const [lastConfig, setLastConfig] = useState<RunConfig | null>(null);

  const updateMeta = useCallback((m: Meta) => {
    setMeta(m);
    saveMeta(m);
  }, []);

  const start = (cfg: RunConfig) => {
    const state = newGame({ ...cfg, legacy: cfg.daily ? [] : meta.legacy });
    writeSave(state);
    setLastConfig(cfg);
    setScreen({ id: 'game', state, key: Date.now() });
  };

  if (screen.id === 'setup') return <Setup meta={meta} onStart={start} onBack={() => setScreen({ id: 'menu' })} />;
  if (screen.id === 'legacy') return <Legacy meta={meta} onMeta={updateMeta} onBack={() => setScreen({ id: 'menu' })} />;
  if (screen.id === 'game') {
    return (
      <Game
        key={screen.key}
        initial={screen.state}
        meta={meta}
        onMeta={updateMeta}
        onMenu={() => {
          if (!screen.state.over) writeSave(screen.state);
          else writeSave(null);
          setScreen({ id: 'menu' });
        }}
        onAgain={() => {
          writeSave(null);
          if (lastConfig && !lastConfig.daily) start({ ...lastConfig, seed: Math.floor(Math.random() * 2 ** 31) });
          else setScreen({ id: 'setup' });
        }}
      />
    );
  }
  const save = loadSave();
  return (
    <MainMenu
      meta={meta}
      save={save}
      onNew={() => setScreen({ id: 'setup' })}
      onContinue={() => save && setScreen({ id: 'game', state: save, key: Date.now() })}
      onDaily={() => start(dailyConfig(todayKey()))}
      onLegacy={() => setScreen({ id: 'legacy' })}
    />
  );
}
