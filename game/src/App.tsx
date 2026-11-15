import { useEffect, useRef, useState } from 'react';
import {wizardAudio,DEFAULT_SOUND_SETTINGS,type SoundSettings} from './audio';
import { initWizardChess } from './wizardChessEngine.js';

export default function App() {
  const initializedRef = useRef(false);
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [soundOpen,setSoundOpen]=useState(false);
  const [soundSettings,setSoundSettings]=useState<SoundSettings>(DEFAULT_SOUND_SETTINGS);
  useEffect(()=>{setSoundSettings(wizardAudio.getSettings());return wizardAudio.subscribe(setSoundSettings)},[]);

  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;
    document.getElementById('startup-status')?.remove();
    try { initWizardChess(); } catch(error) { console.error('Wizard Chess startup:', error); const label=document.getElementById('loader-text'); if(label)label.textContent='The 3D game could not start. Please refresh or try another browser with WebGL enabled.'; }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSoundOpen(false);
        setMobileSheetOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth > 768) {
        setMobileSheetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(()=>{
    if(!soundOpen)return;
    const panel=document.getElementById('sound-panel');
    const controls=panel?.querySelectorAll<HTMLElement>('input,button');
    const first=controls?.[0],last=controls?.[controls.length-1];first?.focus();
    const trap=(event:KeyboardEvent)=>{if(event.key!=='Tab')return;if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus()}};
    panel?.addEventListener('keydown',trap);
    return()=>{panel?.removeEventListener('keydown',trap);const compact=window.matchMedia('(max-width:768px), (pointer:coarse) and (max-height:500px)').matches;document.getElementById(compact?'btn-mobile-controls':'btn-sound')?.focus({preventScroll:true});};
  },[soundOpen]);

  const handleRestoreUI = () => {
    setMobileSheetOpen(false);setSoundOpen(false);
    const win = window as unknown as { wizardChess?: { toggleUI?: (force?: boolean) => void } };
    if (win.wizardChess?.toggleUI) {
      win.wizardChess.toggleUI(false);
    } else {
      document.body.classList.remove('cinematic-ui-hidden');
      const restore=document.getElementById('btn-show-ui');if(restore)restore.hidden=true;
      const btnHide = document.getElementById('btn-hide-ui');
      if (btnHide) btnHide.textContent = 'Hide UI [H]';
    }
  };

  return (
    <>
      <section id="sound-panel" hidden={!soundOpen} aria-label="Sound settings" role="dialog" aria-modal="true">
        <div className="sound-card">
          <h2>Sound settings</h2>
          <p>Quiet ambience and cinematic chess effects.</p>
          {([['ambient','Fire & wind ambience'],['moves','Piece movement'],['captures','Sword hits & statue breaking'],['subtitles','Sound captions']] as const).map(([key,label])=>(
            <label className="sound-option" key={key}><span>{label}</span><input type="checkbox" checked={soundSettings[key]} onChange={e=>{wizardAudio.setSettings({[key]:e.target.checked});void wizardAudio.unlock();}} /></label>
          ))}
          <p className="sound-note">Sound starts after your first tap. Captions can stay on even when sounds are muted.</p>
          <button type="button" className="hud-btn" onClick={()=>setSoundOpen(false)}>Back to game</button>
        </div>
      </section>
      <div className="sound-captions"><div id="audio-ambient-caption"></div><div id="audio-event-caption" role="status" aria-live="polite" aria-atomic="true"></div></div>
      <section id="challenge-panel" className="collapsed" aria-label="Multiplayer challenge">
        <div className="challenge-card">
          <h1>Challenge a friend</h1><p id="challenge-room">A duel in the sanctum. Two players, no timer.</p>
          <div id="challenge-entry">
            <label>Your nickname (optional)<input id="challenge-name" maxLength={24} autoComplete="nickname" placeholder="Your name" /></label>
            <label>Play as<select id="challenge-color"><option value="w">White — first move</option><option value="b">Black</option><option value="random">Random</option></select></label>
            <button id="challenge-start" disabled>Create challenge</button>
            <div className="challenge-join-section">
              <label>Have a challenge code?<input id="challenge-code" maxLength={16} autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="Paste challenge code" enterKeyHint="go" /></label>
              <button id="challenge-join" disabled>Join / watch game</button>
              <p className="challenge-help">Paste a code to join. The first guest plays; later guests watch.</p>
            </div>
          </div>
          <div id="challenge-share" hidden>
            <label>Challenge code<input id="challenge-invite-code" readOnly aria-label="Your challenge code" /></label>
            <button id="challenge-copy">Copy challenge code</button>
            <button id="challenge-share-code">Share code</button>
            <p className="challenge-help">Ask your friend to open Wizards Chess and paste this code into Join / watch game.</p>
            <button id="challenge-another">Create another challenge</button>
          </div>
          <p id="challenge-status" role="status" aria-live="polite"></p><button id="challenge-close">View board</button><button id="challenge-bot">Play against bot</button>
        </div>
      </section>
      <div id="loading-overlay">
        <div className="loader-title">Wizard Chess</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loader-bar"></div>
        </div>
        <div id="loader-text">Summoning Sanctum Architecture &amp; Sculpted Pieces...</div>
      </div>

      <div id="canvas-container"></div>

      <button
        type="button"
        className="hud-btn ui-restore"
        id="btn-show-ui"
        hidden
        aria-controls="hud-top hud-bottom"
        onClick={handleRestoreUI}
        title="Show game controls"
      >
        Show UI
      </button>

      <div id="hud-top">
        <div className="hud-group" id="hud-left">
          <div className="brand-pill">
            <span className="brand-title">Wizard Chess</span>
          </div>
          <div className="status-pill" id="status-pill">
            <span className="turn-dot" id="turn-dot"></span>
            <span id="turn-text">White to Move</span>
            <span className="mode-badge" id="mode-badge">Playing as White</span>
          </div>
        </div>

        <button
          type="button"
          className={`hud-btn mobile-controls-trigger ${mobileSheetOpen ? 'active' : ''}`}
          id="btn-mobile-controls"
          aria-expanded={mobileSheetOpen}
          aria-controls="hud-right"
          onClick={() => setMobileSheetOpen((prev) => !prev)}
        >
          {mobileSheetOpen ? 'Close' : 'Controls'}
        </button>

        <div
          className={`mobile-sheet-backdrop ${mobileSheetOpen ? 'open' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            setMobileSheetOpen(false);
          }}
          aria-hidden="true"
        ></div>

        <div
          className={`hud-group ${mobileSheetOpen ? 'mobile-sheet-open' : ''}`}
          id="hud-right"
        >
          <div
            className="mobile-sheet-handle-wrap"
            onClick={(e) => {
              e.stopPropagation();
              setMobileSheetOpen(false);
            }}
            aria-hidden="true"
          >
            <div className="mobile-sheet-handle"></div>
          </div>

          <div className="mobile-sheet-header">
            <span className="mobile-sheet-title">Controls</span>
            <button
              type="button"
              className="mobile-sheet-close"
              id="btn-mobile-sheet-close"
              onClick={(e) => {
                e.stopPropagation();
                setMobileSheetOpen(false);
              }}
              aria-label="Close Controls"
            >
              Close ✕
            </button>
          </div>

          <div className="mobile-sheet-section-label">Game Actions</div>
          <button className="hud-btn" id="challenge-open" onClick={() => { setMobileSheetOpen(false); document.getElementById('challenge-panel')?.classList.remove('collapsed'); }}>Challenge a friend</button>


          <button
            className="hud-btn"
            id="btn-side-toggle"
            title="Switch between Playing as White and Playing as Black"
            onClick={() => setMobileSheetOpen(false)}
          >
            Play as Black
          </button>
          <button
            className="hud-btn"
            id="btn-ai-move"
            title="Let the AI make the next move immediately"
            onClick={() => setMobileSheetOpen(false)}
          >
            AI Move
          </button>
          <button
            className="hud-btn"
            id="btn-reset"
            title="Start a fresh game on the altar"
            onClick={() => setMobileSheetOpen(false)}
          >
            New Game
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">
            <span>Camera Views</span>
            <span className="mobile-sheet-section-sub">Tap active view to flip</span>
          </div>

          <button
            className="hud-btn active"
            id="btn-cam-player"
            title="Player Camera (Click again to flip White / Black view)"
          >
            Player Cam
          </button>
          <button
            className="hud-btn"
            id="btn-cam-top"
            title="Overhead Board View (Click again to flip White / Black orientation)"
          >
            Overhead
          </button>
          <button
            className="hud-btn"
            id="btn-cam-side"
            title="Side Profile View (Click again to switch East / West side)"
          >
            Side
          </button>
          <button
            className="hud-btn"
            id="btn-cam-wide"
            title="Wide Cathedral View (Click again to switch North Rose / South Narthex)"
          >
            Cathedral
          </button>

          <div className="hud-divider" aria-hidden="true"></div>
          <div className="mobile-sheet-section-label">Display &amp; Gestures</div>
          <button className="hud-btn" id="btn-sound" onClick={()=>{setMobileSheetOpen(false);setSoundOpen(true);void wizardAudio.unlock();}}>Sound settings</button>

          <button
            className="hud-btn"
            id="btn-hide-ui"
            title="Toggle HUD visibility (Shortcut: H)"
            onClick={() => setMobileSheetOpen(false)}
          >
            Hide UI [H]
          </button>

          <div className="mobile-sheet-hint">
            <strong>Touch:</strong> Tap Piece to Move &nbsp;•&nbsp; 1-Finger Drag: Orbit &nbsp;•&nbsp; 2-Finger Drag: Pan &nbsp;•&nbsp; Pinch: Zoom
          </div>
        </div>
      </div>

      <div id="hud-bottom">
        <div className="hint-pill" id="controls-hint">
          <strong>Controls:</strong> Click Piece to Move &nbsp;•&nbsp; Left-Drag: Orbit &nbsp;•&nbsp; Right-Drag: Pan &nbsp;•&nbsp; Scroll: Zoom &nbsp;•&nbsp; WASD + R/F: Fly Cam &nbsp;•&nbsp; H: Hide UI
        </div>
        <div className="captured-pill" id="captured-tray"></div>
      </div>

      <div id="checkmate-overlay" role="status" aria-live="polite">
        <div className="checkmate-banner">
          <div className="checkmate-ornament">✦ &nbsp; Sanctum Judgment &nbsp; ✦</div>
          <div className="checkmate-crown" id="checkmate-crown">♔</div>
          <div className="checkmate-title" id="checkmate-title">Checkmate</div>
          <div className="checkmate-rule"></div>
          <div className="checkmate-subtitle" id="checkmate-subtitle">
            White Triumphs • The Black King Has Fallen
          </div>
          <div className="checkmate-actions">
            <button className="checkmate-btn" id="btn-checkmate-replay">
              Replay King Fall
            </button>
            <button className="checkmate-btn" id="btn-checkmate-newgame">
              New Game
            </button>
            <button className="checkmate-btn secondary" id="btn-checkmate-dismiss">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
