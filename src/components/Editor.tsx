import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAutosave } from '../hooks/useAutosave';
import SaveStatusBar from './SaveStatusBar';



declare const window: Window & {
  jspdf: { jsPDF: new (opts: object) => {
    addImage: (img: string, type: string, x: number, y: number, w: number, h: number) => void;
    save: (name: string) => void;
  }};
};

const FONT_FAMILIES: [string, string][] = [
  ['EB Garamond', 'EB Garamond'],
  ['Playfair Display', 'Playfair Display'],
  ['Cinzel', 'Cinzel'],
  ['Cormorant Garamond', 'Cormorant Garamond'],
  ['Dancing Script', 'Dancing Script'],
  ['Great Vibes', 'Great Vibes'],
  ['Oswald', 'Oswald'],
  ['Bebas Neue', 'Bebas Neue'],
  ['Lato', 'Lato'],
  ['Roboto Condensed', 'Roboto Condensed'],
  ['Georgia', 'Georgia'],
  ['serif', 'Serif (standard)'],
  ['sans-serif', 'Sans-serif'],
];

function buildFontOptions(selectedFont: string) {
  return FONT_FAMILIES.map(([val, label]) =>
    `<option value="${val}"${val === selectedFont ? ' selected' : ''}>${label}</option>`
  ).join('');
}

const TEMPLATES: Record<string, {
  bgColor: string; fadeColor: string; badgeBg: string; dividerColor: string;
  borderColor: string;
  fonts: Record<string, string>; sizes: Record<string, number>;
  field_colors: Record<string, string>; rsvpBg: string; rsvpBorderColor: string;
}> = {
  klassisk: {
    bgColor: '#faf8f4', fadeColor: '#faf8f4', badgeBg: '#1a3a6e',
    dividerColor: '#1a3a6e', borderColor: '#1a3a6e',
    fonts: { topline: 'Cinzel', intro: 'Cormorant Garamond', name: 'Playfair Display', subtitle: 'Cormorant Garamond', date: 'Cinzel', program: 'Cormorant Garamond', greeting: 'Playfair Display', rsvp: 'Cormorant Garamond' },
    sizes: { topline: 11, intro: 15, name: 38, subtitle: 15, date: 12, program: 13, greeting: 22, rsvp: 12 },
    field_colors: { topline: '#1a3a6e', intro: '#3a3a5e', name: '#1a1a2e', subtitle: '#1a3a6e', date: '#ffffff', program: '#2a2a4e', greeting: '#1a3a6e', rsvp: '#1a1a2e' },
    rsvpBg: '#eef0f8', rsvpBorderColor: '#1a3a6e',
  },
  natur: {
    bgColor: '#fdf6ec', fadeColor: '#fdf6ec', badgeBg: '#8b5a2b',
    dividerColor: '#c8a068', borderColor: '#c8a068',
    fonts: { topline: 'Oswald', intro: 'EB Garamond', name: 'Playfair Display', subtitle: 'EB Garamond', date: 'Lato', program: 'EB Garamond', greeting: 'Dancing Script', rsvp: 'Lato' },
    sizes: { topline: 11, intro: 14, name: 38, subtitle: 15, date: 13, program: 12, greeting: 22, rsvp: 11 },
    field_colors: { topline: '#8b5a2b', intro: '#5a3a1a', name: '#2c1a0e', subtitle: '#8b5a2b', date: '#ffffff', program: '#3a2010', greeting: '#8b5a2b', rsvp: '#2c1a0e' },
    rsvpBg: '#f0e8d8', rsvpBorderColor: '#c8a068',
  },
  minimal: {
    bgColor: '#ffffff', fadeColor: '#ffffff', badgeBg: '#111111',
    dividerColor: '#cccccc', borderColor: '#111111',
    fonts: { topline: 'Lato', intro: 'Lato', name: 'Lato', subtitle: 'Lato', date: 'Lato', program: 'Lato', greeting: 'Great Vibes', rsvp: 'Lato' },
    sizes: { topline: 9, intro: 12, name: 42, subtitle: 11, date: 12, program: 11, greeting: 28, rsvp: 11 },
    field_colors: { topline: '#999999', intro: '#555555', name: '#111111', subtitle: '#999999', date: '#ffffff', program: '#333333', greeting: '#111111', rsvp: '#333333' },
    rsvpBg: '#f5f5f5', rsvpBorderColor: '#cccccc',
  },
  romantisk: {
    bgColor: '#fdf0f5', fadeColor: '#fdf0f5', badgeBg: '#c0566a',
    dividerColor: '#e8a0b0', borderColor: '#c0566a',
    fonts: { topline: 'Cormorant Garamond', intro: 'Cormorant Garamond', name: 'Playfair Display', subtitle: 'Cormorant Garamond', date: 'Cormorant Garamond', program: 'Cormorant Garamond', greeting: 'Great Vibes', rsvp: 'Cormorant Garamond' },
    sizes: { topline: 10, intro: 15, name: 40, subtitle: 14, date: 13, program: 13, greeting: 26, rsvp: 12 },
    field_colors: { topline: '#c0566a', intro: '#6a3040', name: '#3a1020', subtitle: '#c0566a', date: '#ffffff', program: '#4a2030', greeting: '#c0566a', rsvp: '#3a1020' },
    rsvpBg: '#fce8ee', rsvpBorderColor: '#e8a0b0',
  },
  hav: {
    bgColor: '#e8f4f8', fadeColor: '#e8f4f8', badgeBg: '#1a6080',
    dividerColor: '#5aabb8', borderColor: '#1a6080',
    fonts: { topline: 'Oswald', intro: 'EB Garamond', name: 'Playfair Display', subtitle: 'EB Garamond', date: 'Oswald', program: 'EB Garamond', greeting: 'Dancing Script', rsvp: 'Lato' },
    sizes: { topline: 10, intro: 14, name: 38, subtitle: 14, date: 12, program: 12, greeting: 24, rsvp: 11 },
    field_colors: { topline: '#1a6080', intro: '#1a4050', name: '#0a2030', subtitle: '#1a6080', date: '#ffffff', program: '#1a3040', greeting: '#1a6080', rsvp: '#0a2030' },
    rsvpBg: '#d0eaf0', rsvpBorderColor: '#5aabb8',
  },
  midnatt: {
    bgColor: '#0f0f1a', fadeColor: '#0f0f1a', badgeBg: '#7c5cbf',
    dividerColor: '#7c5cbf', borderColor: '#7c5cbf',
    fonts: { topline: 'Cinzel', intro: 'Cormorant Garamond', name: 'Cinzel', subtitle: 'Cormorant Garamond', date: 'Cinzel', program: 'Cormorant Garamond', greeting: 'Great Vibes', rsvp: 'Cormorant Garamond' },
    sizes: { topline: 10, intro: 15, name: 34, subtitle: 14, date: 12, program: 13, greeting: 26, rsvp: 12 },
    field_colors: { topline: '#7c5cbf', intro: '#b0a0d8', name: '#e8e0f8', subtitle: '#7c5cbf', date: '#ffffff', program: '#c0b8e0', greeting: '#9c7cdf', rsvp: '#d0c8f0' },
    rsvpBg: '#1a1a2e', rsvpBorderColor: '#7c5cbf',
  },
};

const FIELD_KEYS = ['topline', 'intro', 'name', 'subtitle', 'date', 'program', 'greeting', 'rsvp'];

const DEFAULT_MODULE_ORDER = [
  'topline', 'divider1', 'intro', 'name', 'subtitle',
  'datebadge', 'divider2', 'program', 'divider3', 'greeting', 'rsvp'
];

const MODULE_LABELS: Record<string, string> = {
  topline: 'Topplinje', divider1: '── Skillelinje 1',
  intro: 'Innledning', name: 'Navn', subtitle: 'Undertittel',
  datebadge: 'Dato-badge', divider2: '── Skillelinje 2',
  program: 'Program', divider3: '── Skillelinje 3',
  greeting: 'Hilsen', rsvp: 'RSVP',
  portrait: 'Portrettbilde', cutout: 'Cutout-bilde',
};

export default function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState('default');
  const [projectNameInput, setProjectNameInput] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<{ id: string; updated_at: string }[]>([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const currentProjectIdRef = useRef('default');
  currentProjectIdRef.current = currentProjectId;

  const triggerSave = useCallback(() => {
    pushUndo();
    setSaveVersion(v => v + 1);
  }, []);

  const handleSave = useCallback(async () => {
    const state = collectState();
    await supabase.from('invitation_state').upsert({
      id: currentProjectIdRef.current,
      state,
      updated_at: new Date().toISOString(),
    });
  }, []);

  const { status } = useAutosave({
    data: saveVersion,
    onSave: handleSave,
    delay: 2000,
    enabled: saveEnabled,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      initEditor();
      loadFromSupabase();
    }, 100);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadFromSupabase() {
    const { data } = await supabase
      .from('invitation_state')
      .select('state')
      .eq('id', 'default')
      .single();
    if (data?.state) applyProjectData(data.state);
    setSaveEnabled(true);
  }

  async function saveNamedProject(name: string) {
    const id = name.trim() || 'default';
    const state = collectState();
    const { error } = await supabase.from('invitation_state').upsert({
      id,
      state,
      updated_at: new Date().toISOString(),
    });
    if (error) { showToast('Lagringsfeil: ' + error.message); return; }
    setCurrentProjectId(id);
    showToast(`Lagret som "${id}"!`);
    triggerSave();
  }

  async function loadProjectList() {
    const { data } = await supabase
      .from('invitation_state')
      .select('id, updated_at')
      .order('updated_at', { ascending: false });
    setSavedProjects(data || []);
  }

  async function openNamedProject(id: string) {
    setSaveEnabled(false);
    const { data } = await supabase
      .from('invitation_state')
      .select('state')
      .eq('id', id)
      .single();
    if (data?.state) {
      applyProjectData(data.state);
      setCurrentProjectId(id);
      setProjectNameInput(id === 'default' ? '' : id);
    }
    setShowProjectModal(false);
    setTimeout(() => setSaveEnabled(true), 500);
    showToast(`Åpnet "${id}"!`);
  }

  async function deleteNamedProject(id: string) {
    if (!confirm(`Slett prosjektet "${id}"?`)) return;
    await supabase.from('invitation_state').delete().eq('id', id);
    setSavedProjects(prev => prev.filter(p => p.id !== id));
    if (id === currentProjectId) setCurrentProjectId('default');
  }

  function initEditor() {
    // Build font selects
    document.querySelectorAll('select[id^="fn-"]').forEach(sel => {
      const fieldId = (sel as HTMLSelectElement).id.replace('fn-', '');
      const defaults: Record<string, string> = {
        topline: 'Oswald', intro: 'EB Garamond', name: 'Playfair Display',
        subtitle: 'EB Garamond', date: 'Lato', program: 'EB Garamond',
        greeting: 'Dancing Script', rsvp: 'Lato'
      };
      (sel as HTMLSelectElement).innerHTML = buildFontOptions(defaults[fieldId] || 'Lato');
    });

    // Scale card
    scaleCard();
    window.addEventListener('resize', scaleCard);

    // Apply default template
    applyTemplate('natur');

    // Restore remove.bg key
    const savedKey = localStorage.getItem('removebg_key');
    if (savedKey) {
      const el = document.getElementById('removebg-key') as HTMLInputElement;
      if (el) el.value = savedKey;
    }

    // bg-tolerance slider live update
    const toleranceEl = document.getElementById('bg-tolerance');
    if (toleranceEl) {
      toleranceEl.addEventListener('input', function(this: HTMLInputElement) {
        const v = document.getElementById('bg-tolerance-v');
        if (v) v.textContent = this.value;
      });
    }

    // Expose functions to window for onclick handlers in the HTML
    const w = window as unknown as Record<string, unknown>;
    w.switchTab = switchTab;
    w.toggleAccordion = toggleAccordion;
    w.applyTemplate = applyTemplate;
    w.loadMainImage = loadMainImage;
    w.removeMainImage = removeMainImage;
    w.updateMainHeight = updateMainHeight;
    w.updateMainZoom = updateMainZoom;
    w.updateMainPos = updateMainPos;
    w.loadCutoutImage = loadCutoutImage;
    w.removeCutoutImage = removeCutoutImage;
    w.updateCutout = updateCutout;
    w.loadBgImage = loadBgImage;
    w.removeBgImage = removeBgImage;
    w.updateBgImage = updateBgImage;
    w.removeBackgroundAPI = removeBackgroundAPI;
    w.removeBackgroundCanvas = removeBackgroundCanvas;
    w.removeBackgroundSmartFill = removeBackgroundSmartFill;
    w.resetCutoutToOriginal = resetCutoutToOriginal;
    w.pickBgColor = pickBgColor;
    w.updateCardBg = updateCardBg;
    w.updateFade = updateFade;
    w.updateBadge = updateBadge;
    w.updateDividers = updateDividers;
    w.updateCardBorder = updateCardBorder;
    w.updateOrnament = updateOrnament;
    w.updateRsvpBox = updateRsvpBox;
    w.toggleRsvpTransparent = toggleRsvpTransparent;
    w.toggleRsvpBox = toggleRsvpBox;
    w.syncField = syncField;
    w.toggleBold = toggleBold;
    w.toggleItalic = toggleItalic;
    w.saveProject = saveProject;
    w.loadProject = loadProject;
    w.downloadPDF = downloadPDF;
    w.downloadPNG = downloadPNG;
    w.triggerSave = triggerSave;
    w.updatePortraitFilter = updatePortraitFilter;
    w.updatePortraitFrame = updatePortraitFrame;
    w.updateBgShape = updateBgShape;
    w.undo = undo;
    w.redo = redo;
    w.pushUndo = pushUndo;

    // Keyboard shortcuts for undo/redo
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
    });

    // Wheel zoom on canvas area
    const canvasArea = document.getElementById('canvas-area');
    if (canvasArea) {
      canvasArea.addEventListener('wheel', (e: WheelEvent) => {
        e.preventDefault();
        const area = document.getElementById('canvas-area')!;
        const aW = area.clientWidth - 40, aH = area.clientHeight - 40;
        const autoScale = Math.min(aW / 559, aH / 794, 1);
        const base = zoomOverride ?? autoScale;
        const newZ = Math.min(Math.max(base * (e.deltaY < 0 ? 1.1 : 0.9), 0.2), 2.5);
        zoomOverride = Math.abs(newZ - autoScale) < 0.03 ? null : newZ;
        scaleCard();
      }, { passive: false });
    }

    // Init module order UI
    renderModuleOrderUI(triggerSave);

    applyAllPositions();
    attachAllCardDrag(triggerSave);
    updateAllCardElements();

    const w2 = window as unknown as Record<string, unknown>;
    w2.resetLayout = resetLayout;
  }

  // Editor state (module-level for vanilla JS functions)
  return (
    <div ref={containerRef} style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      <div id="sidebar">
        <div id="sidebar-header">
          <h1>Invitasjons Editor</h1>
          <p>Konfirmasjon 2026</p>
        </div>

        <SaveStatusBar status={status} projectId={currentProjectId} />

        <div id="template-section">
          <h2>Mal</h2>
          <div className="template-cards">
            <div className="tpl-card active" id="tpl-natur" onClick={() => { applyTemplate('natur'); triggerSave(); }}>NATUR<span>Varm/Jord</span></div>
            <div className="tpl-card" id="tpl-klassisk" onClick={() => { applyTemplate('klassisk'); triggerSave(); }}>KLASSISK<span>Lys/Navy</span></div>
            <div className="tpl-card" id="tpl-minimal" onClick={() => { applyTemplate('minimal'); triggerSave(); }}>MINIMAL<span>Ren/Sort</span></div>
            <div className="tpl-card" id="tpl-romantisk" onClick={() => { applyTemplate('romantisk'); triggerSave(); }}>ROMANTISK<span>Rosa/Guld</span></div>
            <div className="tpl-card" id="tpl-hav" onClick={() => { applyTemplate('hav'); triggerSave(); }}>HAV<span>Blå/Frisk</span></div>
            <div className="tpl-card" id="tpl-midnatt" onClick={() => { applyTemplate('midnatt'); triggerSave(); }}>MIDNATT<span>Mørk/Lilla</span></div>
          </div>
        </div>

        <div id="tab-bar">
          <button className="tab-btn active" onClick={() => switchTab('bilder')}>Bilder</button>
          <button className="tab-btn" onClick={() => switchTab('tekst')}>Tekst</button>
          <button className="tab-btn" onClick={() => switchTab('design')}>Design</button>
        </div>

        <div id="tab-content">

          {/* BILDER TAB */}
          <div className="tab-panel active" id="panel-bilder">
            <div className="section-label">Portrettfoto</div>
            <div className="ctrl-block">
              <label>Last opp bilde</label>
              <input type="file" id="main-upload" accept="image/*" onChange={(e) => { loadMainImage(e.nativeEvent as unknown as Event); triggerSave(); }} style={{width:'100%',fontSize:'11px',color:'var(--text-muted)'}} />
              <img id="main-thumb" className="img-preview empty" alt="portrett" />
              <button className="btn btn-danger btn-sm" onClick={() => { removeMainImage(); triggerSave(); }} style={{marginTop:'4px'}}>Fjern bilde</button>
            </div>
            <div className="ctrl-row">
              <label>Fotohøyde</label>
              <input type="range" id="main-height" min="150" max="400" defaultValue="302" onInput={() => { updateMainHeight(); triggerSave(); }} />
              <span className="val-display" id="main-height-v">302px</span>
            </div>
            <div className="ctrl-row">
              <label>Zoom</label>
              <input type="range" id="main-zoom" min="80" max="200" defaultValue="100" onInput={() => { updateMainZoom(); triggerSave(); }} />
              <span className="val-display" id="main-zoom-v">100%</span>
            </div>
            <div className="ctrl-row">
              <label>Posisjon Y</label>
              <input type="range" id="main-pos" min="0" max="100" defaultValue="20" onInput={() => { updateMainPos(); triggerSave(); }} />
              <span className="val-display" id="main-pos-v">20%</span>
            </div>

            <div className="sep"></div>
            <div className="section-label">Fotofilter</div>
            <div className="ctrl-row">
              <label>Filter</label>
              <select id="portrait-filter-mode" onChange={() => { updatePortraitFilter(); triggerSave(); }}>
                <option value="normal">Normal</option>
                <option value="grayscale">Svart-hvitt</option>
                <option value="sepia">Sepia</option>
              </select>
            </div>
            <div className="ctrl-row">
              <label>Lysstyrke <span className="val-display" id="portrait-filter-brightness-v">100%</span></label>
              <input type="range" id="portrait-filter-brightness" min="0" max="200" defaultValue="100" onInput={() => { updatePortraitFilter(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Kontrast <span className="val-display" id="portrait-filter-contrast-v">100%</span></label>
              <input type="range" id="portrait-filter-contrast" min="0" max="200" defaultValue="100" onInput={() => { updatePortraitFilter(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Rammeform</label>
              <select id="portrait-frame-type" onChange={() => { updatePortraitFrame(); triggerSave(); }}>
                <option value="none">Ingen</option>
                <option value="round">Rund</option>
                <option value="oval">Oval</option>
                <option value="arch">Bue-topp</option>
              </select>
            </div>

            <div className="sep"></div>

            <div className="section-label">Cutout-bilde</div>
            <div className="ctrl-block">
              <label>Last opp cutout</label>
              <input type="file" id="cutout-upload" accept="image/*" onChange={(e) => { loadCutoutImage(e.nativeEvent as unknown as Event); triggerSave(); }} style={{width:'100%',fontSize:'11px',color:'var(--text-muted)'}} />
              <img id="cutout-thumb" className="img-preview empty" alt="cutout" />
              <button className="btn btn-danger btn-sm" onClick={() => { removeCutoutImage(); triggerSave(); }} style={{marginTop:'4px'}}>Fjern bilde</button>
            </div>
            <div className="ctrl-row">
              <label>Størrelse</label>
              <input type="range" id="cutout-size" min="80" max="400" defaultValue="220" onInput={() => { updateCutout(); triggerSave(); }} />
              <span className="val-display" id="cutout-size-v">220px</span>
            </div>
            <div className="ctrl-row">
              <label>Høyre</label>
              <input type="range" id="cutout-right" min="-80" max="100" defaultValue="-10" onInput={() => { updateCutout(); triggerSave(); }} />
              <span className="val-display" id="cutout-right-v">-10px</span>
            </div>
            <div className="ctrl-row">
              <label>Bunn</label>
              <input type="range" id="cutout-bottom" min="-100" max="300" defaultValue="30" onInput={() => { updateCutout(); triggerSave(); }} />
              <span className="val-display" id="cutout-bottom-v">30px</span>
            </div>

            <div className="accordion">
              <div className="accordion-header" onClick={(e) => toggleAccordion(e.currentTarget)}>
                <span className="acc-title">Fjern bakgrunn (gratis)</span><span className="chevron">▼</span>
              </div>
              <div className="accordion-body">
                <div style={{padding:'6px 14px 4px',fontSize:'10px',color:'var(--text-muted)',lineHeight:'1.5'}}>
                  Ingen betalt tjeneste nødvendig. Fungerer best på bilder med ensfarget bakgrunn (studio, hvit vegg, blå himmel o.l.).
                </div>
                <div className="ctrl-row">
                  <label>Toleranse</label>
                  <input type="range" id="bg-tolerance" min="5" max="120" defaultValue="40" />
                  <span className="val-display" id="bg-tolerance-v">40</span>
                </div>
                <div style={{padding:'4px 14px 6px',display:'flex',gap:'6px',flexDirection:'column'}}>
                  <button className="btn btn-primary btn-full" onClick={removeBackgroundSmartFill} style={{fontSize:'11px'}}>
                    ✂ Fjern bakgrunn (alle hjørner)
                  </button>
                  <button className="btn btn-secondary btn-full" onClick={pickBgColor} style={{fontSize:'11px'}}>
                    🎨 Klikk på bakgrunnsfargen
                  </button>
                  <button className="btn btn-secondary btn-full" onClick={resetCutoutToOriginal} style={{fontSize:'11px'}}>
                    ↩ Tilbakestill original
                  </button>
                </div>
                <div className="sep"></div>
                <div style={{padding:'4px 14px',fontSize:'10px',color:'var(--text-muted)'}}>
                  For kompleks bakgrunn (gressbane, menneskemengde): last opp et bilde der du allerede har fjernet bakgrunnen i Canva, Photoshop eller iPhone (lang-trykk på motivet).
                </div>
                <div className="sep"></div>
                <div className="ctrl-block">
                  <label>remove.bg API-nøkkel (valgfritt)</label>
                  <input type="password" id="removebg-key" placeholder="Har du API-nøkkel?" onInput={(e) => localStorage.setItem('removebg_key', (e.target as HTMLInputElement).value)} />
                  <button className="btn btn-secondary btn-full" onClick={removeBackgroundAPI} style={{marginTop:'4px',fontSize:'10px'}}>Fjern via remove.bg</button>
                </div>
              </div>
            </div>

            <div className="sep"></div>

            <div className="section-label">Bakgrunnsbilde</div>
            <div className="ctrl-block">
              <label>Last opp bakgrunn</label>
              <input type="file" id="bg-upload" accept="image/*" onChange={(e) => { loadBgImage(e.nativeEvent as unknown as Event); triggerSave(); }} style={{width:'100%',fontSize:'11px',color:'var(--text-muted)'}} />
              <img id="bg-thumb" className="img-preview empty" alt="bakgrunn" />
              <button className="btn btn-danger btn-sm" onClick={() => { removeBgImage(); triggerSave(); }} style={{marginTop:'4px'}}>Fjern bilde</button>
            </div>
            <div className="ctrl-row">
              <label>Opacity</label>
              <input type="range" id="bg-opacity" min="0" max="100" defaultValue="60" onInput={() => { updateBgImage(); triggerSave(); }} />
              <span className="val-display" id="bg-opacity-v">60%</span>
            </div>
            <div className="ctrl-row">
              <label>Posisjon</label>
              <select id="bg-position" onChange={() => { updateBgImage(); triggerSave(); }}>
                <option value="center">Senter</option>
                <option value="top">Topp</option>
                <option value="bottom">Bunn</option>
                <option value="top left">Øvre venstre</option>
                <option value="top right">Øvre høyre</option>
              </select>
            </div>
            <div className="ctrl-row">
              <label>Størrelse</label>
              <select id="bg-size" onChange={() => { updateBgImage(); triggerSave(); }}>
                <option value="cover">Cover</option>
                <option value="contain">Contain</option>
                <option value="auto">Auto</option>
                <option value="100% 100%">Strekk</option>
              </select>
            </div>
          </div>

          {/* TEKST TAB */}
          <div className="tab-panel" id="panel-tekst">
            <div style={{padding:'8px 14px 4px'}}>
              <button className="btn btn-secondary btn-full" style={{fontSize:'11px'}} onClick={() => setShowEmojiPicker(p => !p)}>
                😊 {showEmojiPicker ? 'Lukk symbolvelger' : 'Sett inn symbol'}
              </button>
              {showEmojiPicker && (
                <EmojiPicker onInsert={(emoji) => {
                  if (!lastFocusedFieldKey) return;
                  const el = g('in-' + lastFocusedFieldKey) as HTMLInputElement | HTMLTextAreaElement;
                  if (!el) return;
                  const start = el.selectionStart ?? el.value.length;
                  const end = el.selectionEnd ?? el.value.length;
                  el.value = el.value.slice(0, start) + emoji + el.value.slice(end);
                  el.setSelectionRange(start + emoji.length, start + emoji.length);
                  el.focus();
                  syncField(lastFocusedFieldKey);
                  triggerSave();
                  setShowEmojiPicker(false);
                }} />
              )}
            </div>
            <div className="sep"></div>
            <div className="section-label">Lag / rekkefølge</div>
            <div id="module-order-list" style={{padding:'4px 8px'}}></div>

            {FIELD_KEYS.map(key => (
              <FieldAccordion key={key} fieldKey={key} onChange={triggerSave} />
            ))}
          </div>

          {/* DESIGN TAB */}
          <div className="tab-panel" id="panel-design">

            <div style={{padding:'8px 14px'}}>
              <button className="btn btn-secondary btn-full" style={{fontSize:'11px'}} onClick={() => { resetLayout(); triggerSave(); }}>
                ↺ Tilbakestill standard layout
              </button>
            </div>

            <div className="sep"></div>
            <div className="section-label">Kortbakgrunn</div>
            <div className="ctrl-row">
              <label>Bakgrunnsfarge</label>
              <input type="color" id="card-bg-color" defaultValue="#fdf6ec" onChange={() => { updateCardBg(); triggerSave(); }} />
            </div>

            <div className="sep"></div>
            <div className="section-label">Bakgrunnsform</div>
            <div className="ctrl-row">
              <label>Form</label>
              <select id="bg-shape-type" onChange={() => { updateBgShape(); triggerSave(); }}>
                <option value="none">Ingen</option>
                <option value="wave">Bølge</option>
                <option value="diagonal">Diagonal</option>
                <option value="geometric">Geometrisk</option>
              </select>
            </div>
            <div className="ctrl-row">
              <label>Farge</label>
              <input type="color" id="bg-shape-color" defaultValue="#c8a068" onChange={() => { updateBgShape(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Opacity <span className="val-display" id="bg-shape-opacity-v">80%</span></label>
              <input type="range" id="bg-shape-opacity" min="0" max="100" defaultValue="80" onInput={() => { updateBgShape(); triggerSave(); }} />
            </div>

            <div className="sep"></div>
            <div className="section-label">Gradient-fade</div>
            <div className="ctrl-row">
              <label>Fade-farge</label>
              <input type="color" id="fade-color" defaultValue="#fdf6ec" onChange={() => { updateFade(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Fade-stil</label>
              <select id="fade-style" onChange={() => { updateFade(); triggerSave(); }}>
                <option value="soft">Myk</option>
                <option value="hard">Skarp</option>
                <option value="none">Ingen</option>
              </select>
            </div>

            <div className="sep"></div>
            <div className="section-label">Dato-badge</div>
            <div className="ctrl-row">
              <label>Badge-farge</label>
              <input type="color" id="badge-bg" defaultValue="#8b5a2b" onChange={() => { updateBadge(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Badge-radius</label>
              <input type="range" id="badge-radius" min="0" max="30" defaultValue="20" onInput={() => { updateBadge(); triggerSave(); }} />
              <span className="val-display" id="badge-radius-v">20px</span>
            </div>

            <div className="sep"></div>
            <div className="section-label">Divisor-linjer</div>
            <div className="ctrl-row">
              <label>Linjefarge</label>
              <input type="color" id="divider-color" defaultValue="#c8a068" onChange={() => { updateDividers(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Linjetykkelse</label>
              <input type="range" id="divider-width" min="0" max="3" step={0.5} defaultValue="1" onInput={() => { updateDividers(); triggerSave(); }} />
              <span className="val-display" id="divider-width-v">1px</span>
            </div>

            <div className="sep"></div>
            <div className="section-label">Kortramme</div>
            <div className="ctrl-row">
              <label>Rammestil</label>
              <select id="border-style" onChange={() => { updateCardBorder(); triggerSave(); }}>
                <option value="none">Ingen</option>
                <option value="solid">Enkel</option>
                <option value="double">Dobbel</option>
                <option value="ornament">Dekorativ</option>
              </select>
            </div>
            <div className="ctrl-row">
              <label>Rammefarge</label>
              <input type="color" id="border-color" defaultValue="#c8a068" onChange={() => { updateCardBorder(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Rammetykkelse</label>
              <input type="range" id="border-width" min="1" max="8" defaultValue="3" onInput={() => { updateCardBorder(); triggerSave(); }} />
              <span className="val-display" id="border-width-v">3px</span>
            </div>

            <div className="sep"></div>
            <div className="section-label">Ornament</div>
            <div className="ctrl-row">
              <label>Vis ornament</label>
              <input type="checkbox" id="ornament-visible" onChange={() => { updateOrnament(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Type</label>
              <select id="ornament-type" onChange={() => { updateOrnament(); triggerSave(); }}>
                <option value="flower">Blomst</option>
                <option value="lily">Lilje</option>
                <option value="crown">Krone</option>
                <option value="heart">Hjerte</option>
                <option value="wreath">Løvkrans</option>
              </select>
            </div>
            <div className="ctrl-row">
              <label>Ornament-farge</label>
              <input type="color" id="ornament-color" defaultValue="#c8a068" onChange={() => { updateOrnament(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Ornament-opacity</label>
              <input type="range" id="ornament-opacity" min="0" max="100" defaultValue="80" onChange={() => { updateOrnament(); triggerSave(); }} />
              <span id="ornament-opacity-v">80%</span>
            </div>
          </div>

        </div>

        <div id="save-section">
          <div id="pos-readout" style={{fontSize:'10px',color:'var(--accent)',minHeight:'14px',letterSpacing:'0.5px',marginBottom:'4px'}}></div>
          <div style={{display:'flex',gap:'4px',marginBottom:'6px'}}>
            <button className="btn btn-secondary" style={{flex:1,fontSize:'11px'}} onClick={undo}>↩ Angre</button>
            <button className="btn btn-secondary" style={{flex:1,fontSize:'11px'}} onClick={redo}>↪ Gjenta</button>
          </div>
          <div style={{fontSize:'10px',color:'var(--text-muted)',marginBottom:'4px',letterSpacing:'0.5px'}}>
            {currentProjectId !== 'default' ? `Prosjekt: ${currentProjectId}` : 'Prosjekt: (standard)'}
          </div>
          <div className="save-row" style={{marginBottom:'6px'}}>
            <input
              type="text"
              value={projectNameInput}
              onChange={e => setProjectNameInput(e.target.value)}
              placeholder="Prosjektnavn..."
              style={{flex:1,background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'6px',color:'var(--text-primary)',padding:'7px 10px',fontSize:'12px',fontFamily:'inherit',outline:'none'}}
            />
            <button className="btn btn-primary" style={{marginLeft:'6px',fontSize:'12px',padding:'7px 12px',whiteSpace:'nowrap'}}
              onClick={() => saveNamedProject(projectNameInput || currentProjectId)}>
              Lagre
            </button>
          </div>
          <button className="btn btn-secondary btn-full" style={{marginBottom:'6px',fontSize:'12px'}}
            onClick={async () => { await loadProjectList(); setShowProjectModal(true); }}>
            📂 Åpne prosjekt...
          </button>
          <button className="btn btn-primary btn-full" onClick={downloadPDF}>⬇ Last ned PDF (A5)</button>
          <button className="btn btn-secondary btn-full" onClick={downloadPNG}>🖼 Lagre PNG</button>
        </div>
      </div>

      {/* CANVAS AREA */}
      <div id="canvas-area">
        <button onClick={() => { zoomOverride = null; scaleCard(); }} style={{position:'absolute',top:'8px',right:'8px',zIndex:20,background:'rgba(0,0,0,0.5)',border:'1px solid var(--border)',color:'var(--text-muted)',borderRadius:'4px',padding:'4px 8px',fontSize:'10px',cursor:'pointer',letterSpacing:'0.5px'}}>⊟ TILPASS</button>
        <div id="card-wrapper">
          <div id="invite-card">
            <div id="bg-img-layer"></div>
            <div id="bg-color-layer"></div>
            <div id="bg-shape-layer" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:2}}></div>
            <div id="el-portrait" className="card-el" data-el="portrait" style={{display:'none',width:'559px',height:'302px',backgroundSize:'cover',backgroundPosition:'center 20%',backgroundRepeat:'no-repeat'}}></div>
            <div id="el-portrait-placeholder" style={{position:'absolute',top:0,left:0,width:'100%',height:'302px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:'13px',cursor:'pointer',background:'rgba(200,200,200,0.08)',border:'2px dashed var(--border)',zIndex:3}} onClick={() => (document.getElementById('main-upload') as HTMLInputElement)?.click()}>+ Klikk for å laste opp portrettfoto</div>
            <div id="el-portrait-fade" style={{position:'absolute',pointerEvents:'none',width:'100%',height:'120px',zIndex:4}}></div>
            <div id="el-topline" className="card-el" data-el="topline" style={{textAlign:'center',width:'519px'}}></div>
            <div id="el-divider1" className="card-el" data-el="divider1" style={{width:'479px',height:'1px',background:'#c8a068'}}></div>
            <div id="el-intro" className="card-el" data-el="intro" style={{textAlign:'center',width:'519px'}}></div>
            <div id="el-name" className="card-el" data-el="name" style={{textAlign:'center',width:'519px'}}></div>
            <div id="el-subtitle" className="card-el" data-el="subtitle" style={{textAlign:'center',width:'519px'}}></div>
            <div id="el-datebadge" className="card-el" data-el="datebadge" style={{display:'inline-block'}}></div>
            <div id="el-divider2" className="card-el" data-el="divider2" style={{width:'479px',height:'1px',background:'#c8a068'}}></div>
            <div id="el-program" className="card-el" data-el="program" style={{textAlign:'center',width:'479px'}}></div>
            <div id="el-divider3" className="card-el" data-el="divider3" style={{width:'479px',height:'1px',background:'#c8a068'}}></div>
            <div id="el-greeting" className="card-el" data-el="greeting" style={{textAlign:'center',width:'519px'}}></div>
            <div id="el-rsvp" className="card-el" data-el="rsvp" style={{width:'479px'}}></div>
            <img id="cutout-img" className="card-el" data-el="cutout" alt="cutout" style={{display:'none',width:'220px'}} />
            <div id="snap-guides" style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:25,overflow:'hidden'}}></div>
            <div id="card-border-overlay"></div>
            <div id="ornament" className="card-el" data-el="ornament"></div>
          </div>
        </div>
      </div>

      <div id="toast"></div>

      {showProjectModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000}} onClick={() => setShowProjectModal(false)}>
          <div style={{background:'var(--sidebar-bg)',border:'1px solid var(--border)',borderRadius:'12px',padding:'24px',minWidth:'320px',maxWidth:'480px',width:'90%',maxHeight:'70vh',overflow:'auto'}} onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'11px',letterSpacing:'2px',textTransform:'uppercase',color:'var(--accent)',fontWeight:700,marginBottom:'16px'}}>Lagrede prosjekter</div>
            {savedProjects.length === 0 ? (
              <div style={{color:'var(--text-muted)',fontSize:'12px'}}>Ingen lagrede prosjekter ennå.</div>
            ) : (
              savedProjects.map(p => (
                <div key={p.id} style={{display:'flex',alignItems:'center',gap:'8px',padding:'8px 0',borderBottom:'1px solid var(--border)'}}>
                  <div style={{flex:1}}>
                    <div style={{fontSize:'13px',color:'var(--text-primary)',fontWeight:600}}>{p.id}</div>
                    <div style={{fontSize:'10px',color:'var(--text-muted)'}}>{new Date(p.updated_at).toLocaleString('no-NO')}</div>
                  </div>
                  <button className="btn btn-primary" style={{fontSize:'11px',padding:'5px 10px'}} onClick={() => openNamedProject(p.id)}>Åpne</button>
                  <button className="btn btn-danger" style={{fontSize:'11px',padding:'5px 10px'}} onClick={() => deleteNamedProject(p.id)}>Slett</button>
                </div>
              ))
            )}
            <button className="btn btn-secondary btn-full" style={{marginTop:'16px',fontSize:'12px'}} onClick={() => setShowProjectModal(false)}>Lukk</button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// FIELD ACCORDION COMPONENT
// ============================================================
const FIELD_LABELS: Record<string, string> = {
  topline: 'Topplinje', intro: 'Innledning', name: 'Navn', subtitle: 'Undertittel',
  date: 'Dato-badge', program: 'Program', greeting: 'Hilsen', rsvp: 'RSVP',
};
const FIELD_DEFAULTS: Record<string, string> = {
  topline: 'DU ER HERVED INVITERT TIL',
  intro: 'konfirmasjonen til',
  name: 'Magnus Eirik Hansen',
  subtitle: 'Konfirmant 2026',
  date: 'Lørdag 16. mai 2026',
  program: '12:00 — Gudstjeneste i Gamle Aker Kirke\n14:00 — Middag på Holmenkollen Park Hotell\n19:00 — Fest og moro for alle!',
  greeting: 'Vi ses — og gleder oss!',
  rsvp: 'Svar innen 1. mai til\nmagnus@familie.no\nTlf: 900 00 000',
};
const MULTILINE_FIELDS = ['program', 'rsvp'];

function FieldAccordion({ fieldKey, onChange }: { fieldKey: string; onChange: () => void }) {
  const isMultiline = MULTILINE_FIELDS.includes(fieldKey);
  const label = FIELD_LABELS[fieldKey] || fieldKey;

  return (
    <div className="accordion">
      <div className="accordion-header" onClick={(e) => toggleAccordion(e.currentTarget)}>
        <span className="acc-title">{label}</span><span className="chevron">▼</span>
      </div>
      <div className="accordion-body">
        <div className="ctrl-block">
          <label>Tekst</label>
          {isMultiline ? (
            <textarea id={`in-${fieldKey}`} defaultValue={FIELD_DEFAULTS[fieldKey]} onFocus={() => { lastFocusedFieldKey = fieldKey; }} onInput={() => { syncField(fieldKey); onChange(); }} />
          ) : (
            <input type="text" id={`in-${fieldKey}`} defaultValue={FIELD_DEFAULTS[fieldKey]} onFocus={() => { lastFocusedFieldKey = fieldKey; }} onInput={() => { syncField(fieldKey); onChange(); }} />
          )}
        </div>
        <div className="row2">
          <div>
            <label>Font</label>
            <select id={`fn-${fieldKey}`} onChange={() => { syncField(fieldKey); onChange(); }}></select>
          </div>
          <div>
            <label>Størrelse <span className="val-sm" id={`fs-${fieldKey}-v`}>14px</span></label>
            <input type="range" id={`fs-${fieldKey}`} min="7" max="72" defaultValue="14" onInput={() => { syncField(fieldKey); onChange(); }} />
          </div>
        </div>
        <div className="row2">
          <div>
            <label>Farge</label>
            <input type="color" id={`fc-${fieldKey}`} defaultValue="#333333" onChange={() => { syncField(fieldKey); onChange(); }} />
          </div>
          {!isMultiline ? (
            <div>
              <label>Spacing <span className="val-sm" id={`fls-${fieldKey}-v`}>0px</span></label>
              <input type="range" id={`fls-${fieldKey}`} min="-2" max="15" defaultValue="0" onInput={() => { syncField(fieldKey); onChange(); }} />
            </div>
          ) : (
            <div>
              <label>Linjeavstand <span className="val-sm" id={`flh-${fieldKey}-v`}>1.6</span></label>
              <input type="range" id={`flh-${fieldKey}`} min="10" max="30" defaultValue="16" onInput={() => { syncField(fieldKey); onChange(); }} />
            </div>
          )}
        </div>
        {!isMultiline && (
          <div className="bi-row">
            <label>Format:</label>
            <button className="toggle-btn" id={`fb-${fieldKey}`} onClick={() => { toggleBold(fieldKey); onChange(); }}>B</button>
            <button className="toggle-btn italic" id={`fi-${fieldKey}`} onClick={() => { toggleItalic(fieldKey); onChange(); }}>I</button>
          </div>
        )}
        {fieldKey !== 'date' && (
          <>
            <div className="sep"></div>
            <div className="row2">
              <div>
                <label>Bredde <span className="val-sm" id={`mw-${fieldKey}-v`}>{fieldKey === 'rsvp' || fieldKey === 'program' ? '479' : '519'}px</span></label>
                <input type="range" id={`mw-${fieldKey}`} min="100" max="519" defaultValue={fieldKey === 'rsvp' || fieldKey === 'program' ? '479' : '519'} onInput={() => {
                  const el = document.getElementById(`mw-${fieldKey}`) as HTMLInputElement;
                  const v = document.getElementById(`mw-${fieldKey}-v`);
                  if (v) v.textContent = el.value + 'px';
                  editorState.moduleWidths[fieldKey] = parseInt(el.value);
                  updateCardElement(fieldKey);
                  onChange();
                }} />
              </div>
              <div>
                <label>Justering</label>
                <select id={`ma-${fieldKey}`} defaultValue={fieldKey === 'rsvp' ? 'left' : 'center'} onChange={() => {
                  const el = document.getElementById(`ma-${fieldKey}`) as HTMLSelectElement;
                  editorState.moduleAligns[fieldKey] = el.value;
                  updateCardElement(fieldKey);
                  onChange();
                }}>
                  <option value="left">Venstre</option>
                  <option value="center">Midtstilt</option>
                  <option value="right">Høyre</option>
                </select>
              </div>
            </div>
          </>
        )}
        {fieldKey === 'rsvp' && (
          <>
            <div className="sep"></div>
            <div className="section-label" style={{paddingTop:'6px'}}>RSVP-boks design</div>
            <div className="color-transparent-row">
              <label>Bakgrunn</label>
              <input type="color" id="rsvp-bg" defaultValue="#f0e8d8" onChange={() => { updateRsvpBox(); onChange(); }} />
              <button className="transparent-btn" id="rsvp-transparent-btn" onClick={() => { toggleRsvpTransparent(); onChange(); }}>Gjennomsiktig</button>
            </div>
            <div className="ctrl-row">
              <label>Kantfarge</label>
              <input type="color" id="rsvp-border-color" defaultValue="#c8a068" onChange={() => { updateRsvpBox(); onChange(); }} />
            </div>
            <div className="ctrl-row">
              <label>Kanttykkelse</label>
              <input type="range" id="rsvp-border-w" min="0" max="4" defaultValue="1" onInput={() => { updateRsvpBox(); onChange(); }} />
              <span className="val-display" id="rsvp-border-w-v">1px</span>
            </div>
            <div className="ctrl-row">
              <label>Kantstil</label>
              <select id="rsvp-border-style" onChange={() => { updateRsvpBox(); onChange(); }}>
                <option value="solid">Solid</option>
                <option value="dashed">Stiplet</option>
                <option value="dotted">Prikket</option>
                <option value="none">Ingen</option>
              </select>
            </div>
            <div className="ctrl-row">
              <label>Hjørneradius</label>
              <input type="range" id="rsvp-radius" min="0" max="20" defaultValue="8" onInput={() => { updateRsvpBox(); onChange(); }} />
              <span className="val-display" id="rsvp-radius-v">8px</span>
            </div>
            <div className="ctrl-row">
              <label>Padding</label>
              <input type="range" id="rsvp-padding" min="4" max="32" defaultValue="12" onInput={() => { updateRsvpBox(); onChange(); }} />
              <span className="val-display" id="rsvp-padding-v">12px</span>
            </div>
            <div className="ctrl-row">
              <label>Vis boks</label>
              <input type="checkbox" id="rsvp-visible" defaultChecked onChange={() => { toggleRsvpBox(); onChange(); }} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================
// VANILLA JS EDITOR FUNCTIONS (operate on DOM directly)
// ============================================================
const undoStack: unknown[] = [];
const redoStack: unknown[] = [];

let lastFocusedFieldKey: string | null = null;
let zoomOverride: number | null = null;

const editorState = {
  template: 'natur',
  mainImage: null as string | null,
  cutoutImage: null as string | null,
  cutoutOriginalSrc: null as string | null,
  bgImage: null as string | null,
  bgColorForRemoval: null as string | null,
  rsvpTransparent: false,
  portraitFilter: { mode: 'normal' as 'normal'|'grayscale'|'sepia', brightness: 100, contrast: 100 },
  portraitFrame: 'none' as 'none'|'round'|'oval'|'arch',
  bgShape: { type: 'none' as 'none'|'wave'|'diagonal'|'geometric', color: '#c8a068', opacity: 80 },
  fields: Object.fromEntries(FIELD_KEYS.map(k => [k, { bold: false, italic: k === 'intro' || k === 'subtitle' }])),
  moduleWidths: { topline: 519, intro: 519, name: 519, subtitle: 519, program: 479, greeting: 519, rsvp: 479, date: 0 } as Record<string, number>,
  moduleAligns: { topline: 'center', intro: 'center', name: 'center', subtitle: 'center', program: 'center', greeting: 'center', rsvp: 'left', date: 'center' } as Record<string, string>,
  moduleOrder: [...DEFAULT_MODULE_ORDER],
  hiddenModules: [] as string[],
  customLabels: {} as Record<string, string>,
  selectedElement: null as string | null,
  positions: {
    portrait:  { x: 0,   y: 0,   z: 3  },
    topline:   { x: 0,   y: 312, z: 6  },
    divider1:  { x: 40,  y: 336, z: 6  },
    intro:     { x: 0,   y: 350, z: 6  },
    name:      { x: 0,   y: 370, z: 6  },
    subtitle:  { x: 0,   y: 415, z: 6  },
    datebadge: { x: 80,  y: 440, z: 6  },
    divider2:  { x: 40,  y: 475, z: 6  },
    program:   { x: 20,  y: 490, z: 6  },
    divider3:  { x: 40,  y: 560, z: 6  },
    greeting:  { x: 0,   y: 574, z: 6  },
    rsvp:      { x: 40,  y: 604, z: 6  },
    cutout:    { x: 330, y: 480, z: 10 },
  } as Record<string, { x: number; y: number; z: number }>,
};

let currentCardScale = 1;

function g(id: string): HTMLInputElement {
  return document.getElementById(id) as HTMLInputElement;
}

function showToast(msg: string) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

function scaleCard() {
  const area = document.getElementById('canvas-area');
  const wrapper = document.getElementById('card-wrapper');
  if (!area || !wrapper) return;
  const aW = area.clientWidth - 40;
  const aH = area.clientHeight - 40;
  const autoScale = Math.min(aW / 559, aH / 794, 1);
  currentCardScale = zoomOverride !== null ? Math.min(Math.max(zoomOverride, 0.2), 2.5) : autoScale;
  wrapper.style.transform = `scale(${currentCardScale})`;
  wrapper.style.marginTop = `-${(794 * (1 - currentCardScale)) / 2}px`;
}

function switchTab(name: string) {
  document.querySelectorAll('.tab-btn').forEach((b, i) => {
    const tabs = ['bilder', 'tekst', 'design'];
    b.classList.toggle('active', tabs[i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  const panel = document.getElementById('panel-' + name);
  if (panel) panel.classList.add('active');
}

function toggleAccordion(header: Element) {
  const body = header.nextElementSibling as HTMLElement;
  const isOpen = body.classList.contains('open');
  const parent = header.closest('.tab-panel') || header.closest('#sidebar');
  if (parent) {
    parent.querySelectorAll('.accordion-body.open').forEach(b => {
      b.classList.remove('open');
      (b.previousElementSibling as Element)?.classList.remove('open');
    });
  }
  if (!isOpen) {
    body.classList.add('open');
    header.classList.add('open');
  }
}

function updateCardElement(key: string) {
  const elId = (key === 'date') ? 'datebadge' : key;
  const el = document.getElementById('el-' + elId);
  if (!el) return;

  if (editorState.hiddenModules.includes(elId) || editorState.hiddenModules.includes(key)) {
    el.style.display = 'none';
    return;
  }

  const font = g('fn-' + key)?.value || 'Lato';
  const size = g('fs-' + key)?.value || '14';
  const color = g('fc-' + key)?.value || '#333';
  const bold = editorState.fields[key]?.bold ?? false;
  const italic = editorState.fields[key]?.italic ?? false;
  const spacing = g('fls-' + key)?.value || '0';
  const lhRaw = parseInt(g('flh-' + key)?.value || '16');
  const lh = (lhRaw / 10).toFixed(1);
  const text = getFieldText(key);
  const fw = bold ? '700' : '400';
  const fi = italic ? 'italic' : 'normal';

  // Apply width and text-align from editorState
  if (key !== 'date') {
    const w = editorState.moduleWidths[key];
    if (w) el.style.width = w + 'px';
    const align = editorState.moduleAligns[key] || 'center';
    el.style.textAlign = align;
  }

  if (key === 'date') {
    const badgeBg = g('badge-bg')?.value || '#888';
    const badgeRadius = g('badge-radius')?.value || '20';
    el.style.background = badgeBg;
    el.style.borderRadius = badgeRadius + 'px';
    el.style.padding = '6px 22px';
    el.style.display = 'inline-block';
    el.innerHTML = `<span style="font-family:'${font}',sans-serif;font-size:${size}px;color:${color};font-weight:${fw};font-style:${fi};letter-spacing:${spacing}px;white-space:nowrap;">${text}</span>`;
  } else if (key === 'rsvp') {
    const rsvpVisible = (g('rsvp-visible') as HTMLInputElement)?.checked !== false;
    el.style.display = rsvpVisible ? 'block' : 'none';
    if (rsvpVisible) {
      const rsvpBg = editorState.rsvpTransparent ? 'transparent' : (g('rsvp-bg')?.value || '#f0e8d8');
      const rsvpBorderColor = g('rsvp-border-color')?.value || '#c8a068';
      const rsvpBorderW = g('rsvp-border-w')?.value || '1';
      const rsvpBorderStyle = g('rsvp-border-style')?.value || 'solid';
      const rsvpRadius = g('rsvp-radius')?.value || '8';
      const rsvpPadding = g('rsvp-padding')?.value || '12';
      el.style.background = rsvpBg;
      el.style.border = `${rsvpBorderW}px ${rsvpBorderStyle} ${rsvpBorderColor}`;
      el.style.borderRadius = rsvpRadius + 'px';
      el.style.padding = rsvpPadding + 'px';
      el.innerHTML = `<div style="font-family:'${font}',sans-serif;font-size:${size}px;color:${color};font-weight:${fw};font-style:${fi};line-height:${lh};">${text.replace(/\n/g, '<br>')}</div>`;
    }
  } else if (key === 'program') {
    el.style.fontFamily = `'${font}',serif`;
    el.style.fontSize = size + 'px';
    el.style.color = color;
    el.style.fontWeight = fw;
    el.style.fontStyle = fi;
    el.style.lineHeight = lh;
    el.innerHTML = text.replace(/\n/g, '<br>');
  } else {
    el.style.fontFamily = `'${font}',${key === 'topline' ? 'sans-serif' : 'serif'}`;
    el.style.fontSize = size + 'px';
    el.style.color = color;
    el.style.fontWeight = fw;
    el.style.fontStyle = fi;
    el.style.letterSpacing = spacing + 'px';
    if (key === 'topline') el.style.textTransform = 'uppercase';
    if (key === 'name') el.style.lineHeight = '1.1';
    el.textContent = text;
  }
}

function updateDividerElements() {
  const divColor = g('divider-color')?.value || '#ccc';
  const divW = parseFloat(g('divider-width')?.value || '1');
  ['divider1','divider2','divider3'].forEach(id => {
    const el = document.getElementById('el-' + id);
    if (el) {
      if (editorState.hiddenModules.includes(id)) {
        el.style.display = 'none';
      } else {
        el.style.height = divW + 'px';
        el.style.background = divColor;
        el.style.display = '';
      }
    }
  });
}

function updateAllCardElements() {
  FIELD_KEYS.forEach(k => updateCardElement(k));
  updateDividerElements();
}

function _buildContentNow() {
  updateAllCardElements();
}

function getFieldText(key: string): string {
  const el = g('in-' + key);
  if (!el) return '';
  const val = (el as HTMLTextAreaElement).value || (el as HTMLInputElement).value || '';
  return val.replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function syncField(key: string) {
  const sizeEl = g('fs-' + key);
  const sizeV = document.getElementById('fs-' + key + '-v');
  if (sizeEl && sizeV) sizeV.textContent = sizeEl.value + 'px';

  const spacingEl = g('fls-' + key);
  const spacingV = document.getElementById('fls-' + key + '-v');
  if (spacingEl && spacingV) spacingV.textContent = spacingEl.value + 'px';

  const lhEl = g('flh-' + key);
  const lhV = document.getElementById('flh-' + key + '-v');
  if (lhEl && lhV) lhV.textContent = (parseInt(lhEl.value) / 10).toFixed(1);

  updateCardElement(key);
}

function toggleBold(key: string) {
  editorState.fields[key].bold = !editorState.fields[key].bold;
  const btn = document.getElementById('fb-' + key);
  if (btn) btn.classList.toggle('active', editorState.fields[key].bold);
  updateCardElement(key);
}

function toggleItalic(key: string) {
  editorState.fields[key].italic = !editorState.fields[key].italic;
  const btn = document.getElementById('fi-' + key);
  if (btn) btn.classList.toggle('active', editorState.fields[key].italic);
  updateCardElement(key);
}

// Image helpers
function compressImage(dataURL: string, maxW: number, maxH: number, quality: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      let w = img.width, h = img.height;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      c.getContext('2d')!.drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL('image/jpeg', quality || 0.8));
    };
    img.src = dataURL;
  });
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => resolve((e.target as FileReader).result as string);
    r.readAsDataURL(file);
  });
}

async function loadMainImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  let dataURL = await fileToDataURL(file);
  dataURL = await compressImage(dataURL, 1200, 900, 0.85);
  editorState.mainImage = dataURL;
  const div = document.getElementById('el-portrait') as HTMLElement;
  const placeholder = document.getElementById('el-portrait-placeholder');
  div.style.backgroundImage = `url('${dataURL}')`;
  div.style.display = 'block';
  if (placeholder) placeholder.style.display = 'none';
  const thumb = document.getElementById('main-thumb') as HTMLImageElement;
  thumb.src = dataURL; thumb.classList.remove('empty');
  updateMainHeight();
}

function removeMainImage() {
  editorState.mainImage = null;
  const div = document.getElementById('el-portrait') as HTMLElement;
  div.style.backgroundImage = ''; div.style.display = 'none';
  const placeholder = document.getElementById('el-portrait-placeholder');
  if (placeholder) placeholder.style.display = 'flex';
  const thumb = document.getElementById('main-thumb');
  if (thumb) thumb.classList.add('empty');
  const upload = g('main-upload');
  if (upload) upload.value = '';
}

function updateMainHeight() {
  const h = parseInt(g('main-height')?.value || '302');
  const hv = document.getElementById('main-height-v');
  if (hv) hv.textContent = h + 'px';
  const div = document.getElementById('el-portrait') as HTMLElement;
  const placeholder = document.getElementById('el-portrait-placeholder');
  if (div) div.style.height = h + 'px';
  if (placeholder) (placeholder as HTMLElement).style.height = h + 'px';
  const fade = document.getElementById('el-portrait-fade');
  if (fade) fade.style.top = (h - 120) + 'px';
  updateMainZoom();
  updateMainPos();
}

function updateMainZoom() {
  const zoom = parseInt(g('main-zoom')?.value || '100');
  const zv = document.getElementById('main-zoom-v');
  if (zv) zv.textContent = zoom + '%';
  // Use background-size percentage: 100% = fill width, >100% = zoomed in
  const div = document.getElementById('el-portrait') as HTMLElement;
  if (div) div.style.backgroundSize = zoom === 100 ? 'cover' : zoom + '%';
}

function updateMainPos() {
  const pos = parseInt(g('main-pos')?.value || '20');
  const pv = document.getElementById('main-pos-v');
  if (pv) pv.textContent = pos + '%';
  const div = document.getElementById('el-portrait') as HTMLElement;
  if (div) div.style.backgroundPosition = `center ${pos}%`;
}

async function loadCutoutImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  let dataURL = await fileToDataURL(file);
  dataURL = await compressImage(dataURL, 800, 1000, 0.9);
  editorState.cutoutImage = dataURL;
  editorState.cutoutOriginalSrc = dataURL;
  const img = document.getElementById('cutout-img') as HTMLImageElement;
  img.src = dataURL; img.style.display = 'block';
  const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
  thumb.src = dataURL; thumb.classList.remove('empty');
  updateCutout();
}

function removeCutoutImage() {
  editorState.cutoutImage = null; editorState.cutoutOriginalSrc = null;
  const img = document.getElementById('cutout-img') as HTMLImageElement;
  img.src = ''; img.style.display = 'none';
  const thumb = document.getElementById('cutout-thumb');
  if (thumb) thumb.classList.add('empty');
  const upload = g('cutout-upload');
  if (upload) upload.value = '';
}

function updateCutout() {
  const size = parseInt(g('cutout-size')?.value || '220');
  const right = parseInt(g('cutout-right')?.value || '-10');
  const bottom = parseInt(g('cutout-bottom')?.value || '30');
  const sv = document.getElementById('cutout-size-v'); if (sv) sv.textContent = size + 'px';
  const rv = document.getElementById('cutout-right-v'); if (rv) rv.textContent = right + 'px';
  const bv = document.getElementById('cutout-bottom-v'); if (bv) bv.textContent = bottom + 'px';
  const img = document.getElementById('cutout-img') as HTMLImageElement;
  if (img) {
    img.style.width = size + 'px'; img.style.height = 'auto';
    img.style.right = right + 'px'; img.style.bottom = bottom + 'px';
    img.style.left = 'auto'; img.style.top = 'auto';
  }
}

async function loadBgImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;
  let dataURL = await fileToDataURL(file);
  dataURL = await compressImage(dataURL, 900, 1200, 0.8);
  editorState.bgImage = dataURL;
  const thumb = document.getElementById('bg-thumb') as HTMLImageElement;
  thumb.src = dataURL; thumb.classList.remove('empty');
  updateBgImage();
}

function removeBgImage() {
  editorState.bgImage = null;
  const layer = document.getElementById('bg-img-layer');
  if (layer) layer.style.backgroundImage = 'none';
  const thumb = document.getElementById('bg-thumb');
  if (thumb) thumb.classList.add('empty');
  const upload = g('bg-upload');
  if (upload) upload.value = '';
}

function updateBgImage() {
  const opacity = parseInt(g('bg-opacity')?.value || '60') / 100;
  const position = g('bg-position')?.value || 'center';
  const size = g('bg-size')?.value || 'cover';
  const ov = document.getElementById('bg-opacity-v');
  if (ov) ov.textContent = g('bg-opacity')?.value + '%';
  const layer = document.getElementById('bg-img-layer');
  if (!layer) return;
  if (editorState.bgImage) {
    layer.style.backgroundImage = `url('${editorState.bgImage}')`;
    layer.style.backgroundPosition = position;
    layer.style.backgroundSize = size;
    layer.style.backgroundRepeat = 'no-repeat';
    layer.style.opacity = String(opacity);
  } else {
    layer.style.backgroundImage = 'none';
  }
}

async function removeBackgroundAPI() {
  const apiKey = (g('removebg-key')?.value || '').trim();
  if (!apiKey) { showToast('Angi API-nøkkel for remove.bg'); return; }
  if (!editorState.cutoutOriginalSrc) { showToast('Last opp cutout-bilde først'); return; }
  showToast('Fjerner bakgrunn...');
  try {
    const formData = new FormData();
    formData.append('image_file_b64', editorState.cutoutOriginalSrc.split(',')[1]);
    formData.append('size', 'auto');
    const response = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST', headers: { 'X-Api-Key': apiKey }, body: formData,
    });
    if (!response.ok) throw new Error('Status: ' + response.status);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    editorState.cutoutImage = url;
    const img = document.getElementById('cutout-img') as HTMLImageElement;
    img.src = url; img.style.display = 'block';
    const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
    thumb.src = url;
    showToast('Bakgrunn fjernet!');
  } catch (e) {
    showToast('Feil: ' + (e as Error).message);
  }
}

// BFS flood fill from all edge pixels — only removes background-connected regions,
// preserving interior pixels that happen to match the background color (e.g. green jersey).
function removeBackgroundSmartFill() {
  if (!editorState.cutoutOriginalSrc) { showToast('Last opp cutout-bilde først'); return; }
  const tolerance = parseInt(g('bg-tolerance')?.value || '40');

  // Always work from the original source so repeated calls don't accumulate
  const srcImg = new Image();
  srcImg.onload = () => {
    const canvas = document.createElement('canvas');
    canvas.width = srcImg.naturalWidth; canvas.height = srcImg.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(srcImg, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const w = canvas.width, h = canvas.height;

    // Sample seed colors from all 4 corners + 4 edge midpoints
    const seedPoints = [
      [0, 0], [w - 1, 0], [0, h - 1], [w - 1, h - 1],
      [Math.floor(w / 2), 0], [Math.floor(w / 2), h - 1],
      [0, Math.floor(h / 2)], [w - 1, Math.floor(h / 2)],
    ];
    const bgColors: [number, number, number][] = seedPoints.map(([sx, sy]) => {
      const i = (sy * w + sx) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    });

    function matchesBg(px: number): boolean {
      const r = data[px], gv = data[px + 1], b = data[px + 2];
      if (data[px + 3] === 0) return true; // already transparent
      return bgColors.some(([bgR, bgG, bgB]) =>
        Math.sqrt((r - bgR) ** 2 + (gv - bgG) ** 2 + (b - bgB) ** 2) < tolerance
      );
    }

    // BFS: start queue from all edge pixels that match background
    const visited = new Uint8Array(w * h);
    const queue: number[] = [];

    function enqueueEdge(x: number, y: number) {
      const idx = y * w + x;
      if (!visited[idx] && matchesBg(idx * 4)) {
        visited[idx] = 1;
        queue.push(idx);
      }
    }

    for (let x = 0; x < w; x++) { enqueueEdge(x, 0); enqueueEdge(x, h - 1); }
    for (let y = 1; y < h - 1; y++) { enqueueEdge(0, y); enqueueEdge(w - 1, y); }

    // Flood fill — 4-connected
    let qi = 0;
    while (qi < queue.length) {
      const idx = queue[qi++];
      data[idx * 4 + 3] = 0; // make transparent
      const x = idx % w, y = Math.floor(idx / w);
      const neighbors = [
        x > 0 ? idx - 1 : -1,
        x < w - 1 ? idx + 1 : -1,
        y > 0 ? idx - w : -1,
        y < h - 1 ? idx + w : -1,
      ];
      for (const n of neighbors) {
        if (n >= 0 && !visited[n] && matchesBg(n * 4)) {
          visited[n] = 1;
          queue.push(n);
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
    const result = canvas.toDataURL('image/png');
    editorState.cutoutImage = result;
    const img = document.getElementById('cutout-img') as HTMLImageElement;
    img.src = result;
    const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
    if (thumb) thumb.src = result;
    showToast('Bakgrunn fjernet! Prøv "Tilbakestill" og juster toleranse om nødvendig.');
  };
  srcImg.src = editorState.cutoutOriginalSrc;
}

function resetCutoutToOriginal() {
  if (!editorState.cutoutOriginalSrc) { showToast('Ingen original å tilbakestille til'); return; }
  editorState.cutoutImage = editorState.cutoutOriginalSrc;
  const img = document.getElementById('cutout-img') as HTMLImageElement;
  img.src = editorState.cutoutOriginalSrc; img.style.display = 'block';
  const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
  if (thumb) { thumb.src = editorState.cutoutOriginalSrc; thumb.classList.remove('empty'); }
  showToast('Original gjenopprettet!');
}

function removeBackgroundCanvas() {
  if (!editorState.cutoutOriginalSrc) { showToast('Last opp cutout-bilde først'); return; }
  const tolerance = parseInt(g('bg-tolerance')?.value || '40');
  const tv = document.getElementById('bg-tolerance-v'); if (tv) tv.textContent = String(tolerance);
  const img = document.getElementById('cutout-img') as HTMLImageElement;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || 400; canvas.height = img.naturalHeight || 400;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const bgR = data[0], bgG = data[1], bgB = data[2];
  for (let i = 0; i < data.length; i += 4) {
    const dist = Math.sqrt((data[i] - bgR) ** 2 + (data[i + 1] - bgG) ** 2 + (data[i + 2] - bgB) ** 2);
    if (dist < tolerance) data[i + 3] = 0;
  }
  ctx.putImageData(imageData, 0, 0);
  const result = canvas.toDataURL('image/png');
  editorState.cutoutImage = result;
  img.src = result;
  const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
  thumb.src = result;
  showToast('Bakgrunn fjernet (canvas)!');
}

function pickBgColor() {
  if (!editorState.cutoutOriginalSrc) { showToast('Last opp cutout-bilde først'); return; }
  showToast('Klikk på cutout-bildet for å velge bakgrunnsfarge');
  const img = document.getElementById('cutout-img') as HTMLImageElement;
  function onClickImg(e: MouseEvent) {
    const rect = img.getBoundingClientRect();
    const x = Math.round((e.clientX - rect.left) * (img.naturalWidth / rect.width));
    const y = Math.round((e.clientY - rect.top) * (img.naturalHeight / rect.height));
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const idx = (y * canvas.width + x) * 4;
    const bgR = data[idx], bgG = data[idx + 1], bgB = data[idx + 2];
    const tolerance = parseInt(g('bg-tolerance')?.value || '40');
    for (let i = 0; i < data.length; i += 4) {
      const dist = Math.sqrt((data[i] - bgR) ** 2 + (data[i + 1] - bgG) ** 2 + (data[i + 2] - bgB) ** 2);
      if (dist < tolerance) data[i + 3] = 0;
    }
    ctx.putImageData(imageData, 0, 0);
    const result = canvas.toDataURL('image/png');
    editorState.cutoutImage = result;
    img.src = result;
    const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
    thumb.src = result;
    img.removeEventListener('click', onClickImg);
    img.style.cursor = '';
    showToast('Farge fjernet!');
  }
  img.style.cursor = 'crosshair';
  img.addEventListener('click', onClickImg, { once: true });
}

function updateCardBg() {
  const color = g('card-bg-color')?.value || '#fdf6ec';
  const layer = document.getElementById('bg-color-layer');
  if (layer) layer.style.background = color;
  const card = document.getElementById('invite-card');
  if (card) card.style.backgroundColor = color;
}

function updateFade() {
  const color = g('fade-color')?.value || '#fdf6ec';
  const style = g('fade-style')?.value || 'soft';
  const fade = document.getElementById('el-portrait-fade');
  if (!fade) return;
  if (style === 'none') fade.style.background = 'none';
  else if (style === 'hard') fade.style.background = `linear-gradient(to bottom, transparent 0%, ${color} 60%)`;
  else fade.style.background = `linear-gradient(to bottom, transparent 0%, ${color} 90%)`;
}

function updateBadge() {
  const radius = g('badge-radius')?.value || '20';
  const rv = document.getElementById('badge-radius-v'); if (rv) rv.textContent = radius + 'px';
  updateCardElement('date');
}

function updateDividers() {
  const dv = document.getElementById('divider-width-v');
  if (dv) dv.textContent = (g('divider-width')?.value || '1') + 'px';
  updateDividerElements();
}

function updateCardBorder() {
  const bwv = document.getElementById('border-width-v');
  if (bwv) bwv.textContent = (g('border-width')?.value || '3') + 'px';
  const style = g('border-style')?.value || 'ornament';
  const color = g('border-color')?.value || '#c8a068';
  const width = g('border-width')?.value || '3';
  const overlay = document.getElementById('card-border-overlay');
  if (!overlay) return;
  if (style === 'none') {
    overlay.style.border = 'none'; overlay.innerHTML = '';
  } else if (style === 'ornament') {
    overlay.style.border = 'none';
    overlay.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 559 794" preserveAspectRatio="none" style="position:absolute;inset:0;" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="8" width="543" height="778" fill="none" stroke="${color}" stroke-width="${width}" rx="2"/>
      <rect x="14" y="14" width="531" height="766" fill="none" stroke="${color}" stroke-width="1" rx="2" opacity="0.5"/>
      <g fill="${color}">
        <polygon points="8,8 28,8 8,28" opacity="0.8"/>
        <polygon points="551,8 531,8 551,28" opacity="0.8"/>
        <polygon points="8,786 28,786 8,766" opacity="0.8"/>
        <polygon points="551,786 531,786 551,766" opacity="0.8"/>
      </g>
      <line x1="8" y1="50" x2="8" y2="744" stroke="${color}" stroke-width="1" opacity="0.3"/>
      <line x1="551" y1="50" x2="551" y2="744" stroke="${color}" stroke-width="1" opacity="0.3"/>
      <line x1="50" y1="8" x2="509" y2="8" stroke="${color}" stroke-width="1" opacity="0.3"/>
      <line x1="50" y1="786" x2="509" y2="786" stroke="${color}" stroke-width="1" opacity="0.3"/>
    </svg>`;
  } else {
    overlay.innerHTML = '';
    overlay.style.border = `${width}px ${style} ${color}`;
  }
}

function updateOrnament() {
  const visible = (g('ornament-visible') as HTMLInputElement)?.checked;
  const color = g('ornament-color')?.value || '#c8a068';
  const opacityInput = g('ornament-opacity') as HTMLInputElement;
  const opacityVal = opacityInput ? parseInt(opacityInput.value) : 80;
  const opacityV = document.getElementById('ornament-opacity-v');
  if (opacityV) opacityV.textContent = opacityVal + '%';
  const el = document.getElementById('ornament');
  if (!el) return;
  el.style.display = visible ? 'block' : 'none';
  el.style.opacity = (opacityVal / 100).toString();
  if (visible) {
    el.style.width = '60px'; el.style.height = '60px';
    if (!editorState.positions['ornament']) {
      editorState.positions['ornament'] = { x: 479, y: 674, z: 8 };
    }
    applyPosition('ornament');
    const type = g('ornament-type')?.value || 'flower';
    const svgs: Record<string, string> = {
      flower: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="28" fill="none" stroke="${color}" stroke-width="1.5"/>
        <path d="M30 8 C20 14 10 22 10 30 C10 42 20 52 30 52 C40 52 50 42 50 30 C50 22 40 14 30 8Z" fill="${color}" opacity="0.15"/>
        <ellipse cx="22" cy="26" rx="6" ry="9" fill="${color}" opacity="0.4" transform="rotate(-25,22,26)"/>
        <ellipse cx="38" cy="26" rx="6" ry="9" fill="${color}" opacity="0.4" transform="rotate(25,38,26)"/>
        <ellipse cx="30" cy="36" rx="6" ry="8" fill="${color}" opacity="0.4"/>
      </svg>`,
      lily: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="28" fill="none" stroke="${color}" stroke-width="1.5"/>
        <path d="M30 10 C30 10 24 20 24 28 C24 34 27 38 30 40 C33 38 36 34 36 28 C36 20 30 10 30 10Z" fill="${color}" opacity="0.5"/>
        <path d="M30 10 C30 10 18 18 14 26 C11 32 13 38 16 41 C20 38 24 34 26 28 C28 22 30 10 30 10Z" fill="${color}" opacity="0.35"/>
        <path d="M30 10 C30 10 42 18 46 26 C49 32 47 38 44 41 C40 38 36 34 34 28 C32 22 30 10 30 10Z" fill="${color}" opacity="0.35"/>
        <circle cx="30" cy="41" r="4" fill="${color}" opacity="0.6"/>
        <line x1="30" y1="45" x2="30" y2="52" stroke="${color}" stroke-width="1.5" opacity="0.5"/>
      </svg>`,
      crown: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="28" fill="none" stroke="${color}" stroke-width="1.5"/>
        <path d="M10 40 L10 22 L18 32 L30 14 L42 32 L50 22 L50 40 Z" fill="${color}" opacity="0.35"/>
        <rect x="10" y="40" width="40" height="5" rx="1" fill="${color}" opacity="0.5"/>
        <circle cx="10" cy="22" r="2.5" fill="${color}" opacity="0.7"/>
        <circle cx="30" cy="14" r="2.5" fill="${color}" opacity="0.7"/>
        <circle cx="50" cy="22" r="2.5" fill="${color}" opacity="0.7"/>
      </svg>`,
      heart: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="28" fill="none" stroke="${color}" stroke-width="1.5"/>
        <path d="M30 46 C30 46 10 34 10 22 C10 15 16 10 22 12 C26 13 29 17 30 20 C31 17 34 13 38 12 C44 10 50 15 50 22 C50 34 30 46 30 46Z" fill="${color}" opacity="0.4"/>
        <path d="M30 40 C30 40 16 31 16 22 C16 18 19 15 22 16 C25 17 28 20 30 24 C32 20 35 17 38 16 C41 15 44 18 44 22 C44 31 30 40 30 40Z" fill="${color}" opacity="0.2"/>
      </svg>`,
      wreath: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="28" fill="none" stroke="${color}" stroke-width="1.5"/>
        <circle cx="30" cy="30" r="16" fill="none" stroke="${color}" stroke-width="1" opacity="0.4"/>
        <ellipse cx="14" cy="30" rx="5" ry="8" fill="${color}" opacity="0.35"/>
        <ellipse cx="46" cy="30" rx="5" ry="8" fill="${color}" opacity="0.35"/>
        <ellipse cx="30" cy="14" rx="5" ry="8" fill="${color}" opacity="0.35" transform="rotate(90,30,14)"/>
        <ellipse cx="30" cy="46" rx="5" ry="8" fill="${color}" opacity="0.35" transform="rotate(90,30,46)"/>
        <ellipse cx="18" cy="18" rx="4" ry="7" fill="${color}" opacity="0.25" transform="rotate(45,18,18)"/>
        <ellipse cx="42" cy="18" rx="4" ry="7" fill="${color}" opacity="0.25" transform="rotate(-45,42,18)"/>
        <ellipse cx="18" cy="42" rx="4" ry="7" fill="${color}" opacity="0.25" transform="rotate(-45,18,42)"/>
        <ellipse cx="42" cy="42" rx="4" ry="7" fill="${color}" opacity="0.25" transform="rotate(45,42,42)"/>
        <circle cx="30" cy="30" r="3" fill="${color}" opacity="0.6"/>
      </svg>`,
    };
    el.innerHTML = svgs[type] || svgs.flower;
  }
}

function updateRsvpBox() {
  const bwv = document.getElementById('rsvp-border-w-v'); if (bwv) bwv.textContent = (g('rsvp-border-w')?.value || '1') + 'px';
  const rv = document.getElementById('rsvp-radius-v'); if (rv) rv.textContent = (g('rsvp-radius')?.value || '8') + 'px';
  const pv = document.getElementById('rsvp-padding-v'); if (pv) pv.textContent = (g('rsvp-padding')?.value || '12') + 'px';
  updateCardElement('rsvp');
}

function toggleRsvpTransparent() {
  editorState.rsvpTransparent = !editorState.rsvpTransparent;
  const btn = document.getElementById('rsvp-transparent-btn');
  if (btn) btn.classList.toggle('active', editorState.rsvpTransparent);
  updateCardElement('rsvp');
}

function toggleRsvpBox() { updateCardElement('rsvp'); }

// ============================================================
// PORTRAIT FILTER
// ============================================================
function buildPortraitFilterCSS(): string {
  const f = editorState.portraitFilter;
  const parts: string[] = [];
  if (f.mode === 'grayscale') parts.push('grayscale(1)');
  if (f.mode === 'sepia') parts.push('sepia(1)');
  if (f.brightness !== 100) parts.push(`brightness(${f.brightness / 100})`);
  if (f.contrast !== 100) parts.push(`contrast(${f.contrast / 100})`);
  return parts.join(' ') || 'none';
}

function updatePortraitFilter() {
  const mode = (document.getElementById('portrait-filter-mode') as HTMLSelectElement)?.value || 'normal';
  const brightness = parseInt(g('portrait-filter-brightness')?.value || '100');
  const contrast = parseInt(g('portrait-filter-contrast')?.value || '100');
  editorState.portraitFilter = { mode: mode as 'normal'|'grayscale'|'sepia', brightness, contrast };
  const div = document.getElementById('el-portrait') as HTMLElement;
  if (div) div.style.filter = buildPortraitFilterCSS();
  const bv = document.getElementById('portrait-filter-brightness-v'); if (bv) bv.textContent = brightness + '%';
  const cv = document.getElementById('portrait-filter-contrast-v'); if (cv) cv.textContent = contrast + '%';
}

// ============================================================
// PORTRAIT FRAME
// ============================================================
function updatePortraitFrame() {
  const type = (document.getElementById('portrait-frame-type') as HTMLSelectElement)?.value || 'none';
  editorState.portraitFrame = type as 'none'|'round'|'oval'|'arch';
  const div = document.getElementById('el-portrait') as HTMLElement;
  if (!div) return;
  if (type === 'none') { div.style.clipPath = ''; div.style.borderRadius = ''; }
  else if (type === 'round') { div.style.clipPath = 'circle(46% at 50% 50%)'; div.style.borderRadius = ''; }
  else if (type === 'oval') { div.style.clipPath = 'ellipse(47% 48% at 50% 50%)'; div.style.borderRadius = ''; }
  else if (type === 'arch') { div.style.clipPath = ''; div.style.borderRadius = '50% 50% 0 0 / 30% 30% 0 0'; }
}

// ============================================================
// BACKGROUND SHAPE
// ============================================================
function buildBgShapeSVG(): string {
  const { type, color, opacity } = editorState.bgShape;
  const alpha = opacity / 100;
  if (type === 'wave') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="559" height="794"><path d="M0,640 Q140,570 279,640 Q420,710 559,640 L559,794 L0,794 Z" fill="${color}" opacity="${alpha}"/><path d="M0,680 Q140,620 279,680 Q420,740 559,680 L559,794 L0,794 Z" fill="${color}" opacity="${alpha * 0.5}"/></svg>`;
  } else if (type === 'diagonal') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="559" height="794"><polygon points="559,0 559,794 0,794" fill="${color}" opacity="${alpha}"/></svg>`;
  } else if (type === 'geometric') {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="559" height="794"><defs><pattern id="geo" width="44" height="44" patternUnits="userSpaceOnUse"><path d="M22 4 L40 22 L22 40 L4 22 Z" fill="none" stroke="${color}" stroke-width="1" opacity="${alpha}"/></pattern></defs><rect width="559" height="794" fill="url(#geo)"/></svg>`;
  }
  return '';
}

function updateBgShape() {
  editorState.bgShape.type = (document.getElementById('bg-shape-type') as HTMLSelectElement)?.value as typeof editorState.bgShape.type || 'none';
  editorState.bgShape.color = g('bg-shape-color')?.value || '#c8a068';
  editorState.bgShape.opacity = parseInt(g('bg-shape-opacity')?.value || '80');
  const ov = document.getElementById('bg-shape-opacity-v'); if (ov) ov.textContent = editorState.bgShape.opacity + '%';
  const layer = document.getElementById('bg-shape-layer');
  if (!layer) return;
  const svg = buildBgShapeSVG();
  layer.innerHTML = svg ? `<div style="position:absolute;inset:0;width:100%;height:100%;">${svg}</div>` : '';
}

// ============================================================
// SNAP-TO-GRID GUIDE LINES
// ============================================================
function showGuideLines(snapX: number | null, snapY: number | null) {
  const el = document.getElementById('snap-guides');
  if (!el) return;
  let html = '';
  if (snapX !== null) html += `<div style="position:absolute;left:${snapX}px;top:0;width:1px;height:100%;background:rgba(74,158,255,0.7);pointer-events:none;z-index:99;"></div>`;
  if (snapY !== null) html += `<div style="position:absolute;top:${snapY}px;left:0;width:100%;height:1px;background:rgba(74,158,255,0.7);pointer-events:none;z-index:99;"></div>`;
  el.innerHTML = html;
}

function clearGuideLines() {
  const el = document.getElementById('snap-guides');
  if (el) el.innerHTML = '';
}

function applyTemplate(name: string) {
  const t = TEMPLATES[name];
  if (!t) return;
  editorState.template = name;

  document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('active'));
  document.getElementById('tpl-' + name)?.classList.add('active');

  g('card-bg-color').value = t.bgColor;
  const card = document.getElementById('invite-card');
  if (card) card.style.backgroundColor = t.bgColor;
  const layer = document.getElementById('bg-color-layer');
  if (layer) layer.style.background = t.bgColor;

  g('fade-color').value = t.fadeColor;
  g('badge-bg').value = t.badgeBg;
  g('divider-color').value = t.dividerColor;
  g('border-color').value = t.borderColor;
  if (g('rsvp-bg')) g('rsvp-bg').value = t.rsvpBg;
  if (g('rsvp-border-color')) g('rsvp-border-color').value = t.rsvpBorderColor;

  FIELD_KEYS.forEach(k => {
    const fnEl = g('fn-' + k);
    if (fnEl && t.fonts[k]) fnEl.innerHTML = buildFontOptions(t.fonts[k]);
    const fsEl = g('fs-' + k);
    if (fsEl && t.sizes[k]) {
      fsEl.value = String(t.sizes[k]);
      const sv = document.getElementById('fs-' + k + '-v');
      if (sv) sv.textContent = t.sizes[k] + 'px';
    }
    const fcEl = g('fc-' + k);
    if (fcEl && t.field_colors[k]) fcEl.value = t.field_colors[k];
  });

  if (name === 'natur' || name === 'klassisk' || name === 'romantisk' || name === 'hav' || name === 'midnatt') {
    editorState.fields.intro.italic = true;
    editorState.fields.subtitle.italic = true;
  } else {
    editorState.fields.intro.italic = false;
    editorState.fields.subtitle.italic = false;
  }

  FIELD_KEYS.forEach(k => {
    const fbb = document.getElementById('fb-' + k);
    const fib = document.getElementById('fi-' + k);
    if (fbb) fbb.classList.toggle('active', editorState.fields[k].bold);
    if (fib) fib.classList.toggle('active', editorState.fields[k].italic);
  });

  updateFade();
  updateCardBorder();
  updateAllCardElements();
}

// ============================================================
// MODULE ORDER DRAG-AND-DROP
// ============================================================
function renderModuleOrderUI(triggerSave?: () => void) {
  const list = document.getElementById('module-order-list');
  if (!list) return;
  list.innerHTML = '';
  editorState.moduleOrder.forEach((key, index) => {
    const item = document.createElement('div');
    item.className = 'module-drag-item';
    item.setAttribute('draggable', 'true');
    item.setAttribute('data-key', key);
    item.setAttribute('data-index', String(index));
    const isHidden = editorState.hiddenModules.includes(key);
    const labelText = editorState.customLabels[key] || MODULE_LABELS[key] || key;
    item.innerHTML = `<span class="drag-handle">⠿</span><input class="module-label-input" data-key="${key}" value="${labelText.replace(/"/g, '&quot;')}" style="opacity:${isHidden ? 0.4 : 1};background:none;border:none;border-bottom:1px solid transparent;color:inherit;font:inherit;font-size:11px;letter-spacing:0.5px;text-transform:uppercase;width:120px;cursor:text;padding:0 2px;" /><button class="module-vis-btn" data-key="${key}" title="${isHidden ? 'Vis' : 'Skjul'}" style="margin-left:auto;background:none;border:none;cursor:pointer;font-size:14px;padding:0 4px;opacity:${isHidden ? 0.4 : 0.8}">${isHidden ? '🚫' : '👁'}</button>`;
    list.appendChild(item);
  });
  attachDragHandlers(list, triggerSave);
  list.querySelectorAll('.module-label-input').forEach(inp => {
    const input = inp as HTMLInputElement;
    input.addEventListener('mousedown', e => e.stopPropagation());
    input.addEventListener('focus', () => { input.style.borderBottomColor = 'var(--accent)'; });
    input.addEventListener('blur', () => {
      input.style.borderBottomColor = 'transparent';
      const key = input.getAttribute('data-key')!;
      const val = input.value.trim();
      if (val && val !== (MODULE_LABELS[key] || key)) {
        editorState.customLabels[key] = val;
      } else {
        delete editorState.customLabels[key];
      }
      if (triggerSave) triggerSave();
    });
    input.addEventListener('keydown', e => { if (e.key === 'Enter') input.blur(); });
  });
  list.querySelectorAll('.module-vis-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const key = (btn as HTMLElement).getAttribute('data-key')!;
      const idx = editorState.hiddenModules.indexOf(key);
      if (idx >= 0) {
        editorState.hiddenModules.splice(idx, 1);
      } else {
        editorState.hiddenModules.push(key);
      }
      renderModuleOrderUI(triggerSave);
      updateAllCardElements();
      updateDividerElements();
      if (triggerSave) triggerSave();
    });
  });
}

function attachDragHandlers(list: HTMLElement, triggerSave?: () => void) {
  let dragSrc: HTMLElement | null = null;

  list.querySelectorAll('.module-drag-item').forEach(item => {
    const el = item as HTMLElement;

    el.addEventListener('dragstart', (e: DragEvent) => {
      dragSrc = el;
      el.classList.add('dragging');
      e.dataTransfer!.effectAllowed = 'move';
      e.dataTransfer!.setData('text/plain', el.getAttribute('data-index') || '');
    });

    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      list.querySelectorAll('.module-drag-item').forEach(i => (i as HTMLElement).classList.remove('drag-over'));
    });

    el.addEventListener('dragover', (e: DragEvent) => {
      e.preventDefault();
      e.dataTransfer!.dropEffect = 'move';
      list.querySelectorAll('.module-drag-item').forEach(i => (i as HTMLElement).classList.remove('drag-over'));
      el.classList.add('drag-over');
    });

    el.addEventListener('drop', (e: DragEvent) => {
      e.preventDefault();
      if (!dragSrc || dragSrc === el) return;

      const fromIdx = parseInt(dragSrc.getAttribute('data-index') || '0');
      const toIdx = parseInt(el.getAttribute('data-index') || '0');

      // Reorder
      const newOrder = [...editorState.moduleOrder];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      editorState.moduleOrder = newOrder;

      renderModuleOrderUI(triggerSave);
      updateAllCardElements();
      if (triggerSave) triggerSave();
    });
  });
}

// ============================================================
// FREE-POSITION DRAG SYSTEM
// ============================================================
function applyPosition(id: string) {
  const el = id === 'cutout' ? document.getElementById('cutout-img') : id === 'ornament' ? document.getElementById('ornament') : document.getElementById('el-' + id);
  if (!el) return;
  const pos = editorState.positions[id];
  if (!pos) return;
  (el as HTMLElement).style.left = pos.x + 'px';
  (el as HTMLElement).style.top = pos.y + 'px';
  (el as HTMLElement).style.right = 'auto';
  (el as HTMLElement).style.bottom = 'auto';
  (el as HTMLElement).style.zIndex = String(pos.z);
}

function applyAllPositions() {
  Object.keys(editorState.positions).forEach(id => applyPosition(id));
}

function selectCardElement(id: string) {
  editorState.selectedElement = id;
  document.querySelectorAll('.card-el').forEach(e => e.classList.remove('selected'));
  const el = id === 'cutout' ? document.getElementById('cutout-img') : document.getElementById('el-' + id);
  if (el) el.classList.add('selected');
  const FIELD_KEYS_LOCAL = ['topline', 'intro', 'name', 'subtitle', 'program', 'greeting', 'rsvp'];
  const dateFields = ['datebadge'];
  if (FIELD_KEYS_LOCAL.includes(id) || dateFields.includes(id)) {
    switchTab('tekst');
    const fieldKey = id === 'datebadge' ? 'date' : id;
    const inputEl = document.getElementById('in-' + fieldKey);
    const acc = inputEl?.closest('.accordion');
    if (acc) {
      const header = acc.querySelector('.accordion-header') as HTMLElement;
      if (header && !header.classList.contains('open')) toggleAccordion(header);
    }
  } else if (id === 'portrait' || id === 'cutout') {
    switchTab('bilder');
  } else if (id.startsWith('divider')) {
    switchTab('design');
  }
  const readout = document.getElementById('pos-readout');
  if (readout) {
    const pos = editorState.positions[id];
    readout.textContent = pos ? `${MODULE_LABELS[id] || id}: X ${Math.round(pos.x)} · Y ${Math.round(pos.y)}` : '';
  }
}

function attachCardDrag(id: string, triggerSave: () => void) {
  const el = id === 'cutout' ? document.getElementById('cutout-img') : id === 'ornament' ? document.getElementById('ornament') : document.getElementById('el-' + id);
  if (!el) return;
  const htmlEl = el as HTMLElement;
  let startClientX = 0, startClientY = 0, origX = 0, origY = 0, dragging = false;

  htmlEl.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    htmlEl.setPointerCapture(e.pointerId);
    selectCardElement(id);
    if (!editorState.positions[id]) editorState.positions[id] = { x: 0, y: 0, z: 6 };
    origX = editorState.positions[id].x;
    origY = editorState.positions[id].y;
    startClientX = e.clientX;
    startClientY = e.clientY;
    dragging = true;
  });

  htmlEl.addEventListener('pointermove', (e: PointerEvent) => {
    if (!dragging || !htmlEl.hasPointerCapture(e.pointerId)) return;
    const dx = (e.clientX - startClientX) / currentCardScale;
    const dy = (e.clientY - startClientY) / currentCardScale;
    const rawX = origX + dx;
    const rawY = origY + dy;
    const snapThreshold = 10 / currentCardScale;
    const xSnaps = [0, 20, 40, 186, 279, 373, 519, 539, 559];
    const ySnaps = [0, 20, 200, 397, 600, 774, 794];
    Object.entries(editorState.positions).forEach(([otherId, pos]) => {
      if (otherId !== id) { xSnaps.push(pos.x); ySnaps.push(pos.y); }
    });
    let snappedX = rawX, snappedY = rawY, didSnapX = false, didSnapY = false;
    for (const sp of xSnaps) { if (Math.abs(rawX - sp) < snapThreshold) { snappedX = sp; didSnapX = true; break; } }
    for (const sp of ySnaps) { if (Math.abs(rawY - sp) < snapThreshold) { snappedY = sp; didSnapY = true; break; } }
    editorState.positions[id].x = Math.round(snappedX);
    editorState.positions[id].y = Math.round(snappedY);
    applyPosition(id);
    showGuideLines(didSnapX ? snappedX : null, didSnapY ? snappedY : null);
    const readout = document.getElementById('pos-readout');
    if (readout) readout.textContent = `${MODULE_LABELS[id] || id}: X ${Math.round(editorState.positions[id].x)} · Y ${Math.round(editorState.positions[id].y)}`;
  });

  htmlEl.addEventListener('pointerup', (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    htmlEl.releasePointerCapture(e.pointerId);
    clearGuideLines();
    triggerSave();
  });
}

function attachAllCardDrag(triggerSave: () => void) {
  ['portrait','topline','divider1','intro','name','subtitle','datebadge','divider2','program','divider3','greeting','rsvp','cutout','ornament'].forEach(id => attachCardDrag(id, triggerSave));
}

function resetLayout() {
  editorState.positions = {
    portrait:  { x: 0,   y: 0,   z: 3  },
    topline:   { x: 0,   y: 312, z: 6  },
    divider1:  { x: 40,  y: 336, z: 6  },
    intro:     { x: 0,   y: 350, z: 6  },
    name:      { x: 0,   y: 370, z: 6  },
    subtitle:  { x: 0,   y: 415, z: 6  },
    datebadge: { x: 80,  y: 440, z: 6  },
    divider2:  { x: 40,  y: 475, z: 6  },
    program:   { x: 20,  y: 490, z: 6  },
    divider3:  { x: 40,  y: 560, z: 6  },
    greeting:  { x: 0,   y: 574, z: 6  },
    rsvp:      { x: 40,  y: 604, z: 6  },
    cutout:    { x: 330, y: 480, z: 10 },
  };
  applyAllPositions();
}

// ============================================================
// COLLECT / APPLY STATE
// ============================================================
function collectState() {
  const fields: Record<string, unknown> = {};
  FIELD_KEYS.forEach(k => {
    const textEl = g('in-' + k) as HTMLTextAreaElement;
    fields[k] = {
      text: textEl ? textEl.value : '',
      fontFamily: g('fn-' + k)?.value,
      fontSize: g('fs-' + k)?.value,
      color: g('fc-' + k)?.value,
      bold: editorState.fields[k].bold,
      italic: editorState.fields[k].italic,
      letterSpacing: g('fls-' + k)?.value,
      lineHeight: g('flh-' + k)?.value,
    };
  });

  return {
    version: 2,
    template: editorState.template,
    fields,
    images: {
      main: {
        src: editorState.mainImage,
        zoom: g('main-zoom')?.value,
        position: g('main-pos')?.value,
        height: g('main-height')?.value,
        filter: { ...editorState.portraitFilter },
        frameType: editorState.portraitFrame,
      },
      cutout: {
        src: editorState.cutoutImage,
        originalSrc: editorState.cutoutOriginalSrc,
        width: g('cutout-size')?.value,
        right: g('cutout-right')?.value,
        bottom: g('cutout-bottom')?.value,
      },
      bg: {
        src: editorState.bgImage,
        opacity: g('bg-opacity')?.value,
        position: g('bg-position')?.value,
        size: g('bg-size')?.value,
      }
    },
    card: {
      bgColor: g('card-bg-color')?.value,
      fadeColor: g('fade-color')?.value,
      fadeStyle: g('fade-style')?.value,
      badgeBg: g('badge-bg')?.value,
      badgeRadius: g('badge-radius')?.value,
      dividerColor: g('divider-color')?.value,
      dividerWidth: g('divider-width')?.value,
      borderStyle: g('border-style')?.value,
      borderColor: g('border-color')?.value,
      borderWidth: g('border-width')?.value,
      ornamentVisible: (g('ornament-visible') as HTMLInputElement)?.checked,
      ornamentColor: g('ornament-color')?.value,
      ornamentOpacity: (g('ornament-opacity') as HTMLInputElement)?.value,
      ornamentType: g('ornament-type')?.value,
      rsvpBg: g('rsvp-bg')?.value,
      rsvpBorderColor: g('rsvp-border-color')?.value,
      rsvpBorderW: g('rsvp-border-w')?.value,
      rsvpBorderStyle: g('rsvp-border-style')?.value,
      rsvpRadius: g('rsvp-radius')?.value,
      rsvpPadding: g('rsvp-padding')?.value,
      rsvpVisible: (g('rsvp-visible') as HTMLInputElement)?.checked,
      rsvpTransparent: editorState.rsvpTransparent,
      bgShape: { ...editorState.bgShape },
    },
    removebgKey: g('removebg-key')?.value,
    moduleOrder: [...editorState.moduleOrder],
    hiddenModules: [...editorState.hiddenModules],
    customLabels: { ...editorState.customLabels },
    positions: JSON.parse(JSON.stringify(editorState.positions)),
    moduleWidths: { ...editorState.moduleWidths },
    moduleAligns: { ...editorState.moduleAligns },
  };
}

function pushUndo() {
  undoStack.push(collectState());
  if (undoStack.length > 20) undoStack.shift();
  redoStack.length = 0;
}

function undo() {
  if (undoStack.length === 0) { showToast('Ingenting å angre'); return; }
  redoStack.push(collectState());
  applyProjectData(undoStack.pop() as Record<string, unknown>);
  showToast('Angret ↩');
}

function redo() {
  if (redoStack.length === 0) { showToast('Ingenting å gjøre om'); return; }
  undoStack.push(collectState());
  applyProjectData(redoStack.pop() as Record<string, unknown>);
  showToast('Gjort om ↪');
}

function applyProjectData(data: Record<string, unknown>) {
  if (!data) return;

  if (data.template) {
    editorState.template = data.template as string;
    document.querySelectorAll('.tpl-card').forEach(c => c.classList.remove('active'));
    document.getElementById('tpl-' + data.template)?.classList.add('active');
  }

  if (data.removebgKey) {
    const el = g('removebg-key');
    if (el) el.value = data.removebgKey as string;
  }

  if (data.fields) {
    const fields = data.fields as Record<string, Record<string, unknown>>;
    FIELD_KEYS.forEach(k => {
      const fd = fields[k];
      if (!fd) return;
      const textEl = g('in-' + k) as HTMLTextAreaElement;
      if (textEl) textEl.value = (fd.text as string) || '';
      const fnEl = g('fn-' + k);
      if (fnEl && fd.fontFamily) fnEl.innerHTML = buildFontOptions(fd.fontFamily as string);
      const fsEl = g('fs-' + k);
      if (fsEl && fd.fontSize) { fsEl.value = fd.fontSize as string; const sv = document.getElementById('fs-' + k + '-v'); if (sv) sv.textContent = fd.fontSize + 'px'; }
      const fcEl = g('fc-' + k);
      if (fcEl && fd.color) fcEl.value = fd.color as string;
      const flsEl = g('fls-' + k);
      if (flsEl && fd.letterSpacing !== undefined) { flsEl.value = fd.letterSpacing as string; const sv = document.getElementById('fls-' + k + '-v'); if (sv) sv.textContent = fd.letterSpacing + 'px'; }
      const flhEl = g('flh-' + k);
      if (flhEl && fd.lineHeight !== undefined) { flhEl.value = fd.lineHeight as string; const sv = document.getElementById('flh-' + k + '-v'); if (sv) sv.textContent = (Number(fd.lineHeight) / 10).toFixed(1); }
      editorState.fields[k].bold = !!fd.bold;
      editorState.fields[k].italic = !!fd.italic;
      const fbb = document.getElementById('fb-' + k);
      const fib = document.getElementById('fi-' + k);
      if (fbb) fbb.classList.toggle('active', editorState.fields[k].bold);
      if (fib) fib.classList.toggle('active', editorState.fields[k].italic);
    });
  }

  if (data.images) {
    const images = data.images as Record<string, Record<string, unknown>>;
    const mi = images.main;
    if (mi) {
      if (mi.src) {
        editorState.mainImage = mi.src as string;
        const div = document.getElementById('el-portrait') as HTMLElement;
        div.style.backgroundImage = `url('${mi.src as string}')`; div.style.display = 'block';
        const ph = document.getElementById('el-portrait-placeholder');
        if (ph) ph.style.display = 'none';
        const thumb = document.getElementById('main-thumb') as HTMLImageElement;
        thumb.src = mi.src as string; thumb.classList.remove('empty');
      }
      if (mi.height) { g('main-height').value = mi.height as string; const hv = document.getElementById('main-height-v'); if (hv) hv.textContent = mi.height + 'px'; }
      if (mi.zoom) { g('main-zoom').value = mi.zoom as string; const zv = document.getElementById('main-zoom-v'); if (zv) zv.textContent = mi.zoom + '%'; }
      if (mi.position) { g('main-pos').value = mi.position as string; const pv = document.getElementById('main-pos-v'); if (pv) pv.textContent = mi.position + '%'; }
      updateMainHeight();
      if (mi.filter) {
        editorState.portraitFilter = mi.filter as typeof editorState.portraitFilter;
        const fm = document.getElementById('portrait-filter-mode') as HTMLSelectElement; if (fm) fm.value = editorState.portraitFilter.mode;
        const fb = g('portrait-filter-brightness'); if (fb) fb.value = String(editorState.portraitFilter.brightness);
        const fc = g('portrait-filter-contrast'); if (fc) fc.value = String(editorState.portraitFilter.contrast);
        updatePortraitFilter();
      }
      if (mi.frameType) {
        editorState.portraitFrame = mi.frameType as typeof editorState.portraitFrame;
        const el = document.getElementById('portrait-frame-type') as HTMLSelectElement; if (el) el.value = mi.frameType as string;
        updatePortraitFrame();
      }
    }

    const ci = images.cutout;
    if (ci) {
      if (ci.src) {
        editorState.cutoutImage = ci.src as string;
        editorState.cutoutOriginalSrc = (ci.originalSrc as string) || (ci.src as string);
        const img = document.getElementById('cutout-img') as HTMLImageElement;
        img.src = ci.src as string; img.style.display = 'block';
        const thumb = document.getElementById('cutout-thumb') as HTMLImageElement;
        thumb.src = ci.src as string; thumb.classList.remove('empty');
      }
      if (ci.width) g('cutout-size').value = ci.width as string;
      if (ci.right) g('cutout-right').value = ci.right as string;
      if (ci.bottom) g('cutout-bottom').value = ci.bottom as string;
      updateCutout();
    }

    const bi = images.bg;
    if (bi) {
      if (bi.src) {
        editorState.bgImage = bi.src as string;
        const thumb = document.getElementById('bg-thumb') as HTMLImageElement;
        thumb.src = bi.src as string; thumb.classList.remove('empty');
      }
      if (bi.opacity) g('bg-opacity').value = bi.opacity as string;
      if (bi.position) g('bg-position').value = bi.position as string;
      if (bi.size) g('bg-size').value = bi.size as string;
      updateBgImage();
    }
  }

  if (data.card) {
    const c = data.card as Record<string, unknown>;
    if (c.bgColor) { g('card-bg-color').value = c.bgColor as string; updateCardBg(); }
    if (c.fadeColor) g('fade-color').value = c.fadeColor as string;
    if (c.fadeStyle) g('fade-style').value = c.fadeStyle as string;
    if (c.badgeBg) g('badge-bg').value = c.badgeBg as string;
    if (c.badgeRadius) { g('badge-radius').value = c.badgeRadius as string; const bv = document.getElementById('badge-radius-v'); if (bv) bv.textContent = c.badgeRadius + 'px'; }
    if (c.dividerColor) g('divider-color').value = c.dividerColor as string;
    if (c.dividerWidth) { g('divider-width').value = c.dividerWidth as string; const dv = document.getElementById('divider-width-v'); if (dv) dv.textContent = c.dividerWidth + 'px'; }
    if (c.borderStyle) g('border-style').value = c.borderStyle as string;
    if (c.borderColor) g('border-color').value = c.borderColor as string;
    if (c.borderWidth) { g('border-width').value = c.borderWidth as string; const bwv = document.getElementById('border-width-v'); if (bwv) bwv.textContent = c.borderWidth + 'px'; }
    const ov = g('ornament-visible') as HTMLInputElement;
    if (ov) ov.checked = !!c.ornamentVisible;
    if (c.ornamentColor) g('ornament-color').value = c.ornamentColor as string;
    if (c.ornamentOpacity !== undefined) { g('ornament-opacity').value = c.ornamentOpacity as string; const ov2 = document.getElementById('ornament-opacity-v'); if (ov2) ov2.textContent = c.ornamentOpacity + '%'; }
    if (c.ornamentType) g('ornament-type').value = c.ornamentType as string;
    if (g('rsvp-bg') && c.rsvpBg) g('rsvp-bg').value = c.rsvpBg as string;
    if (g('rsvp-border-color') && c.rsvpBorderColor) g('rsvp-border-color').value = c.rsvpBorderColor as string;
    if (g('rsvp-border-w') && c.rsvpBorderW !== undefined) { g('rsvp-border-w').value = c.rsvpBorderW as string; const bwv = document.getElementById('rsvp-border-w-v'); if (bwv) bwv.textContent = c.rsvpBorderW + 'px'; }
    if (g('rsvp-border-style') && c.rsvpBorderStyle) g('rsvp-border-style').value = c.rsvpBorderStyle as string;
    if (g('rsvp-radius') && c.rsvpRadius !== undefined) { g('rsvp-radius').value = c.rsvpRadius as string; const rv = document.getElementById('rsvp-radius-v'); if (rv) rv.textContent = c.rsvpRadius + 'px'; }
    if (g('rsvp-padding') && c.rsvpPadding !== undefined) { g('rsvp-padding').value = c.rsvpPadding as string; const pv = document.getElementById('rsvp-padding-v'); if (pv) pv.textContent = c.rsvpPadding + 'px'; }
    const rsvpVisEl = g('rsvp-visible') as HTMLInputElement;
    if (rsvpVisEl) rsvpVisEl.checked = c.rsvpVisible !== false;
    editorState.rsvpTransparent = !!c.rsvpTransparent;
    const rtBtn = document.getElementById('rsvp-transparent-btn');
    if (rtBtn) rtBtn.classList.toggle('active', editorState.rsvpTransparent);
    updateFade();
    updateCardBorder();
    updateOrnament();
    if (c.bgShape) {
      editorState.bgShape = c.bgShape as typeof editorState.bgShape;
      const st = document.getElementById('bg-shape-type') as HTMLSelectElement; if (st) st.value = editorState.bgShape.type;
      const sc = g('bg-shape-color'); if (sc) sc.value = editorState.bgShape.color;
      const so = g('bg-shape-opacity'); if (so) so.value = String(editorState.bgShape.opacity);
      updateBgShape();
    }
  }

  if (data.moduleOrder && Array.isArray(data.moduleOrder)) {
    editorState.moduleOrder = data.moduleOrder as string[];
    renderModuleOrderUI();
  }

  if (Array.isArray(data.hiddenModules)) {
    editorState.hiddenModules = data.hiddenModules as string[];
  }
  if (data.customLabels && typeof data.customLabels === 'object') {
    editorState.customLabels = data.customLabels as Record<string, string>;
  }

  if (data.positions && typeof data.positions === 'object') {
    const savedPos = data.positions as Record<string, {x:number;y:number;z:number}>;
    Object.keys(savedPos).forEach(id => {
      if (editorState.positions[id]) {
        editorState.positions[id] = { ...editorState.positions[id], ...savedPos[id] };
      }
    });
    applyAllPositions();
  }

  if (data.moduleWidths && typeof data.moduleWidths === 'object') {
    const mw = data.moduleWidths as Record<string, number>;
    Object.keys(mw).forEach(k => {
      editorState.moduleWidths[k] = mw[k];
      const el = document.getElementById(`mw-${k}`) as HTMLInputElement;
      if (el) { el.value = String(mw[k]); const v = document.getElementById(`mw-${k}-v`); if (v) v.textContent = mw[k] + 'px'; }
    });
  }

  if (data.moduleAligns && typeof data.moduleAligns === 'object') {
    const ma = data.moduleAligns as Record<string, string>;
    Object.keys(ma).forEach(k => {
      editorState.moduleAligns[k] = ma[k];
      const el = document.getElementById(`ma-${k}`) as HTMLSelectElement;
      if (el) el.value = ma[k];
    });
  }

  updateAllCardElements();
}

// Local save/load (fallback)
function saveProject() {
  try {
    const data = collectState();
    const json = JSON.stringify(data);
    localStorage.setItem('konfirmasjon_project', json);
    showToast('Prosjekt lagret lokalt!');
  } catch (e) {
    showToast('Lagringsfeil: ' + (e as Error).message);
  }
}

function loadProject() {
  const raw = localStorage.getItem('konfirmasjon_project');
  if (!raw) { showToast('Ingen lagret prosjekt funnet'); return; }
  try {
    applyProjectData(JSON.parse(raw));
    showToast('Prosjekt lastet!');
  } catch (e) {
    showToast('Lastingsfeil: ' + (e as Error).message);
  }
}

// ============================================================
// CANVAS 2D RENDERER — pixel-perfect export
// ============================================================

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function renderCardToCanvas(): Promise<HTMLCanvasElement> {
  const W = 559, H = 794;
  const SCALE = 2;
  const canvas = document.createElement('canvas');
  canvas.width = W * SCALE;
  canvas.height = H * SCALE;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(SCALE, SCALE);

  await document.fonts.ready;

  // ── 1. Background color ─────────────────────────────────
  const bgColor = g('card-bg-color')?.value || '#fdf6ec';
  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, W, H);

  // ── 1b. Background shape ─────────────────────────────────────
  if (editorState.bgShape.type !== 'none') {
    const svgStr = buildBgShapeSVG();
    const blob = new Blob([svgStr], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    try {
      const svgImg = await loadImg(url);
      ctx.drawImage(svgImg, 0, 0, W, H);
    } catch(_) { /* ignore */ }
    finally { URL.revokeObjectURL(url); }
  }

  // ── 2. Background image ─────────────────────────────────
  if (editorState.bgImage) {
    try {
      const bgImg = await loadImg(editorState.bgImage);
      const opacity = parseInt(g('bg-opacity')?.value || '60') / 100;
      const bgPosition = g('bg-position')?.value || 'center';
      const bgSize = g('bg-size')?.value || 'cover';

      ctx.save();
      ctx.globalAlpha = opacity;

      const iw = bgImg.naturalWidth, ih = bgImg.naturalHeight;

      let sw = W, sh = H, sx = 0, sy = 0;

      if (bgSize === 'cover') {
        const scale = Math.max(W / iw, H / ih);
        sw = iw * scale; sh = ih * scale;
      } else if (bgSize === 'contain') {
        const scale = Math.min(W / iw, H / ih);
        sw = iw * scale; sh = ih * scale;
      } else if (bgSize === '100% 100%') {
        sw = W; sh = H;
      } else {
        // auto — natural size
        sw = iw; sh = ih;
      }

      // Horizontal alignment
      if (bgPosition.includes('left')) sx = 0;
      else if (bgPosition.includes('right')) sx = W - sw;
      else sx = (W - sw) / 2; // center

      // Vertical alignment
      if (bgPosition.includes('top')) sy = 0;
      else if (bgPosition.includes('bottom')) sy = H - sh;
      else sy = (H - sh) / 2; // center

      ctx.drawImage(bgImg, sx, sy, sw, sh);
      ctx.restore();
    } catch (_e) {
      // ignore bg image load failure
    }
  }

  // ── 3. Portrait image ────────────────────────────────────
  const portraitPos = editorState.positions.portrait || { x: 0, y: 0 };
  const portraitHeight = parseInt(g('main-height')?.value || '302');
  const portraitZoom = parseInt(g('main-zoom')?.value || '100');
  const portraitPosY = parseInt(g('main-pos')?.value || '20');

  if (editorState.mainImage) {
    try {
      const portImg = await loadImg(editorState.mainImage);
      const iw = portImg.naturalWidth, ih = portImg.naturalHeight;
      const tw = W, th = portraitHeight;
      const scale = Math.max(tw / iw, th / ih) * (portraitZoom / 100);
      const scaledW = iw * scale, scaledH = ih * scale;
      const imgX = portraitPos.x + (tw - scaledW) / 2;
      const posYFrac = portraitPosY / 100;
      const imgY = portraitPos.y + (th - scaledH) * posYFrac;

      ctx.save();
      const frameType = editorState.portraitFrame;
      const portraitX = portraitPos.x;
      const portraitY = portraitPos.y;
      ctx.beginPath();
      if (frameType === 'round') {
        const cx = portraitX + W / 2, cy = portraitY + th / 2, r = Math.min(W, th) * 0.46;
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
      } else if (frameType === 'oval') {
        const cx = portraitX + W / 2, cy = portraitY + th / 2;
        ctx.ellipse(cx, cy, W * 0.47, th * 0.48, 0, 0, Math.PI * 2);
      } else if (frameType === 'arch') {
        const r2 = Math.min(W / 2, th * 0.3);
        ctx.moveTo(portraitX, portraitY + th);
        ctx.lineTo(portraitX, portraitY + r2);
        ctx.arcTo(portraitX, portraitY, portraitX + r2, portraitY, r2);
        ctx.lineTo(portraitX + W - r2, portraitY);
        ctx.arcTo(portraitX + W, portraitY, portraitX + W, portraitY + r2, r2);
        ctx.lineTo(portraitX + W, portraitY + th);
        ctx.closePath();
      } else {
        ctx.rect(portraitX, portraitY, W - portraitX, th);
      }
      ctx.clip();
      ctx.filter = buildPortraitFilterCSS();
      ctx.drawImage(portImg, imgX, imgY, scaledW, scaledH);
      ctx.filter = 'none';
      ctx.restore();
    } catch (_e) {
      // ignore portrait load failure
    }
  }

  // ── 4. Portrait fade gradient ────────────────────────────
  const fadeColor = g('fade-color')?.value || bgColor;
  const fadeStyle = g('fade-style')?.value || 'soft';

  if (fadeStyle !== 'none') {
    const fadeTop = portraitPos.y + portraitHeight - 120;
    const fadeBottom = portraitPos.y + portraitHeight;
    const grad = ctx.createLinearGradient(0, fadeTop, 0, fadeBottom);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    const stopPct = fadeStyle === 'hard' ? 0.6 : 0.9;
    // parse fadeColor hex to rgba
    const fr = parseInt(fadeColor.slice(1, 3), 16);
    const fg = parseInt(fadeColor.slice(3, 5), 16);
    const fb = parseInt(fadeColor.slice(5, 7), 16);
    grad.addColorStop(stopPct, `rgba(${fr},${fg},${fb},0)`);
    grad.addColorStop(1, `rgba(${fr},${fg},${fb},1)`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, fadeTop, W, 120);
  }

  // ── 5 & 6. Text fields and dividers ──────────────────────
  // Helper to preload a Google Font by trying to measure with it
  async function ensureFont(family: string, weight: string, style: string) {
    try {
      await document.fonts.load(`${style} ${weight} 16px '${family}'`);
    } catch (_e) { /* ignore */ }
  }

  // Draw divider line
  function drawDivider(divKey: string) {
    const pos = editorState.positions[divKey] || { x: 40, y: 336 };
    const divColor = g('divider-color')?.value || '#ccc';
    const divW = parseFloat(g('divider-width')?.value || '1');
    if (divW <= 0) return;
    ctx.save();
    ctx.strokeStyle = divColor;
    ctx.lineWidth = divW;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineTo(pos.x + 479, pos.y);
    ctx.stroke();
    ctx.restore();
  }

  // Draw a text field
  async function drawTextField(key: string) {
    const elId = (key === 'date') ? 'datebadge' : key;
    const pos = editorState.positions[elId] || { x: 0, y: 312 };
    const font = g('fn-' + key)?.value || 'Lato';
    const size = parseInt(g('fs-' + key)?.value || '14');
    const color = g('fc-' + key)?.value || '#333333';
    const bold = editorState.fields[key]?.bold ?? false;
    const italic = editorState.fields[key]?.italic ?? false;
    const spacing = parseFloat(g('fls-' + key)?.value || '0');
    const lhRaw = parseInt(g('flh-' + key)?.value || '16');
    const lh = (lhRaw / 10) * size;

    const textEl = g('in-' + key) as HTMLTextAreaElement | HTMLInputElement;
    const rawText = textEl ? (textEl.value || '') : '';

    const fw = bold ? '700' : '400';
    const fi = italic ? 'italic' : 'normal';

    await ensureFont(font, fw, fi);

    ctx.save();
    ctx.font = `${fi} ${fw} ${size}px '${font}', serif`;
    ctx.fillStyle = color;
    ctx.textBaseline = 'top';
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = spacing + 'px';

    if (key === 'date') {
      // Date badge — drawn separately in step 8
      ctx.restore();
      return;
    }

    if (key === 'topline') {
      const elWidth = 519;
      const centerX = pos.x + elWidth / 2;
      ctx.textAlign = 'center';
      ctx.fillText(rawText.toUpperCase(), centerX, pos.y);
    } else if (key === 'program' || key === 'rsvp') {
      // multiline
      const elWidth = 479;
      const centerX = pos.x + elWidth / 2;
      ctx.textAlign = 'center';
      const lines = rawText.split('\n');
      lines.forEach((line, i) => {
        ctx.fillText(line, centerX, pos.y + i * lh);
      });
    } else {
      // single-line centered
      const elWidth = 519;
      const centerX = pos.x + elWidth / 2;
      ctx.textAlign = 'center';
      ctx.fillText(rawText, centerX, pos.y);
    }

    ctx.restore();
  }

  // Draw dividers
  for (const divKey of ['divider1', 'divider2', 'divider3']) {
    if (!editorState.hiddenModules.includes(divKey)) {
      drawDivider(divKey);
    }
  }

  // Draw text fields (all except 'date' which is handled as badge)
  for (const key of ['topline', 'intro', 'name', 'subtitle', 'program', 'greeting', 'rsvp']) {
    if (!editorState.hiddenModules.includes(key)) {
      await drawTextField(key);
    }
  }

  // ── 8. Date badge ─────────────────────────────────────────
  if (!editorState.hiddenModules.includes('datebadge') && !editorState.hiddenModules.includes('date')) {
    const badgePos = editorState.positions.datebadge || { x: 80, y: 440 };
    const badgeBg = g('badge-bg')?.value || '#8b5a2b';
    const badgeRadius = parseInt(g('badge-radius')?.value || '20');
    const font = g('fn-date')?.value || 'Lato';
    const size = parseInt(g('fs-date')?.value || '13');
    const color = g('fc-date')?.value || '#ffffff';
    const bold = editorState.fields['date']?.bold ?? false;
    const italic = editorState.fields['date']?.italic ?? false;
    const spacing = parseFloat(g('fls-date')?.value || '0');
    const fw = bold ? '700' : '400';
    const fi = italic ? 'italic' : 'normal';
    const dateEl = g('in-date');
    const dateText = dateEl ? dateEl.value || '' : '';
    const paddingX = 22, paddingY = 6;

    await ensureFont(font, fw, fi);

    ctx.save();
    ctx.font = `${fi} ${fw} ${size}px '${font}', sans-serif`;
    (ctx as CanvasRenderingContext2D & { letterSpacing?: string }).letterSpacing = spacing + 'px';
    const metrics = ctx.measureText(dateText);
    const textW = metrics.width;
    const boxW = textW + paddingX * 2;
    const boxH = size + paddingY * 2;

    roundRect(ctx, badgePos.x, badgePos.y, boxW, boxH, badgeRadius);
    ctx.fillStyle = badgeBg;
    ctx.fill();

    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(dateText, badgePos.x + boxW / 2, badgePos.y + paddingY);
    ctx.restore();
  }

  // ── 9. RSVP box (background + border) ───────────────────
  {
    const rsvpVisible = (g('rsvp-visible') as HTMLInputElement)?.checked !== false;
    if (rsvpVisible) {
      const rsvpPos = editorState.positions.rsvp || { x: 40, y: 604 };
      const rsvpBg = editorState.rsvpTransparent ? null : (g('rsvp-bg')?.value || '#f0e8d8');
      const rsvpBorderColor = g('rsvp-border-color')?.value || '#c8a068';
      const rsvpBorderW = parseFloat(g('rsvp-border-w')?.value || '1');
      const rsvpBorderStyleVal = g('rsvp-border-style')?.value || 'solid';
      const rsvpRadius = parseInt(g('rsvp-radius')?.value || '8');
      const rsvpPadding = parseInt(g('rsvp-padding')?.value || '12');

      // Measure RSVP text height to determine box size
      const font = g('fn-rsvp')?.value || 'Lato';
      const size = parseInt(g('fs-rsvp')?.value || '11');
      const bold = editorState.fields['rsvp']?.bold ?? false;
      const italic = editorState.fields['rsvp']?.italic ?? false;
      const fw = bold ? '700' : '400';
      const fi = italic ? 'italic' : 'normal';
      const lhRaw = parseInt(g('flh-rsvp')?.value || '16');
      const lh = (lhRaw / 10) * size;

      const rsvpTextEl = g('in-rsvp') as HTMLTextAreaElement;
      const rsvpText = rsvpTextEl ? rsvpTextEl.value || '' : '';
      const rsvpLines = rsvpText.split('\n');
      const textH = rsvpLines.length * lh;

      const boxW = 479;
      const boxH = textH + rsvpPadding * 2;

      ctx.save();
      roundRect(ctx, rsvpPos.x, rsvpPos.y, boxW, boxH, rsvpRadius);
      if (rsvpBg) {
        ctx.fillStyle = rsvpBg;
        ctx.fill();
      }
      if (rsvpBorderW > 0 && rsvpBorderStyleVal !== 'none') {
        ctx.strokeStyle = rsvpBorderColor;
        ctx.lineWidth = rsvpBorderW;
        if (rsvpBorderStyleVal === 'dashed') ctx.setLineDash([8, 4]);
        else if (rsvpBorderStyleVal === 'dotted') ctx.setLineDash([2, 4]);
        else ctx.setLineDash([]);
        ctx.stroke();
      }
      ctx.restore();

      // Draw RSVP text on top of box
      await ensureFont(font, fw, fi);
      ctx.save();
      ctx.font = `${fi} ${fw} ${size}px '${font}', serif`;
      ctx.fillStyle = g('fc-rsvp')?.value || '#333333';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      const centerX = rsvpPos.x + boxW / 2;
      rsvpLines.forEach((line, i) => {
        ctx.fillText(line, centerX, rsvpPos.y + rsvpPadding + i * lh);
      });
      ctx.restore();
    }
  }

  // ── 10. Cutout image ──────────────────────────────────────
  if (editorState.cutoutImage) {
    try {
      const cutoutImg = await loadImg(editorState.cutoutImage);
      const cutoutSize = parseInt(g('cutout-size')?.value || '220');
      const cutoutRight = parseInt(g('cutout-right')?.value || '-10');
      const cutoutBottom = parseInt(g('cutout-bottom')?.value || '30');

      // In the DOM, cutout uses right/bottom. Convert to left/top for canvas:
      const aspectRatio = cutoutImg.naturalHeight / cutoutImg.naturalWidth;
      const drawW = cutoutSize;
      const drawH = cutoutSize * aspectRatio;
      const drawX = W - cutoutSize - cutoutRight;
      const drawY = H - drawH - cutoutBottom;

      ctx.drawImage(cutoutImg, drawX, drawY, drawW, drawH);
    } catch (_e) {
      // ignore cutout load failure
    }
  }

  // ── 11. Ornament ──────────────────────────────────────────
  {
    const ornamentVisible = (g('ornament-visible') as HTMLInputElement)?.checked;
    if (ornamentVisible) {
      const c2 = g('ornament-color')?.value || '#c8a068';
      const ornamentOpacity = parseInt((g('ornament-opacity') as HTMLInputElement)?.value || '80') / 100;
      const ornamentType = g('ornament-type')?.value || 'flower';
      const ornamentPos = editorState.positions['ornament'] || { x: 479, y: 674 };
      const ox = ornamentPos.x;
      const oy = ornamentPos.y;
      ctx.save();
      ctx.globalAlpha = ornamentOpacity;
      ctx.strokeStyle = c2; ctx.fillStyle = c2;
      ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(ox+30, oy+30, 28, 0, Math.PI*2); ctx.stroke();

      if (ornamentType === 'flower') {
        ctx.globalAlpha = ornamentOpacity * 0.15;
        ctx.beginPath(); ctx.moveTo(ox+30,oy+8); ctx.bezierCurveTo(ox+20,oy+14,ox+10,oy+22,ox+10,oy+30); ctx.bezierCurveTo(ox+10,oy+42,ox+20,oy+52,ox+30,oy+52); ctx.bezierCurveTo(ox+40,oy+52,ox+50,oy+42,ox+50,oy+30); ctx.bezierCurveTo(ox+50,oy+22,ox+40,oy+14,ox+30,oy+8); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.4;
        ctx.save(); ctx.translate(ox+22,oy+26); ctx.rotate(-25*Math.PI/180); ctx.beginPath(); ctx.ellipse(0,0,6,9,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(ox+38,oy+26); ctx.rotate(25*Math.PI/180); ctx.beginPath(); ctx.ellipse(0,0,6,9,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.ellipse(ox+30,oy+36,6,8,0,0,Math.PI*2); ctx.fill();

      } else if (ornamentType === 'lily') {
        ctx.globalAlpha = ornamentOpacity * 0.5;
        ctx.beginPath(); ctx.moveTo(ox+30,oy+10); ctx.bezierCurveTo(ox+24,oy+16,ox+24,oy+24,ox+24,oy+28); ctx.bezierCurveTo(ox+24,oy+34,ox+27,oy+38,ox+30,oy+40); ctx.bezierCurveTo(ox+33,oy+38,ox+36,oy+34,ox+36,oy+28); ctx.bezierCurveTo(ox+36,oy+24,ox+36,oy+16,ox+30,oy+10); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.35;
        ctx.beginPath(); ctx.moveTo(ox+30,oy+10); ctx.bezierCurveTo(ox+22,oy+14,ox+16,oy+18,ox+14,oy+26); ctx.bezierCurveTo(ox+11,oy+32,ox+13,oy+38,ox+16,oy+41); ctx.bezierCurveTo(ox+20,oy+38,ox+24,oy+34,ox+26,oy+28); ctx.bezierCurveTo(ox+28,oy+22,ox+30,oy+10,ox+30,oy+10); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(ox+30,oy+10); ctx.bezierCurveTo(ox+38,oy+14,ox+44,oy+18,ox+46,oy+26); ctx.bezierCurveTo(ox+49,oy+32,ox+47,oy+38,ox+44,oy+41); ctx.bezierCurveTo(ox+40,oy+38,ox+36,oy+34,ox+34,oy+28); ctx.bezierCurveTo(ox+32,oy+22,ox+30,oy+10,ox+30,oy+10); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.6;
        ctx.beginPath(); ctx.arc(ox+30,oy+41,4,0,Math.PI*2); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.5;
        ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(ox+30,oy+45); ctx.lineTo(ox+30,oy+52); ctx.stroke();

      } else if (ornamentType === 'crown') {
        ctx.globalAlpha = ornamentOpacity * 0.35;
        ctx.beginPath(); ctx.moveTo(ox+10,oy+40); ctx.lineTo(ox+10,oy+22); ctx.lineTo(ox+18,oy+32); ctx.lineTo(ox+30,oy+14); ctx.lineTo(ox+42,oy+32); ctx.lineTo(ox+50,oy+22); ctx.lineTo(ox+50,oy+40); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.5;
        ctx.beginPath(); ctx.rect(ox+10,oy+40,40,5); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.7;
        ctx.beginPath(); ctx.arc(ox+10,oy+22,2.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ox+30,oy+14,2.5,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.arc(ox+50,oy+22,2.5,0,Math.PI*2); ctx.fill();

      } else if (ornamentType === 'heart') {
        ctx.globalAlpha = ornamentOpacity * 0.4;
        ctx.beginPath(); ctx.moveTo(ox+30,oy+46); ctx.bezierCurveTo(ox+20,oy+40,ox+10,oy+34,ox+10,oy+22); ctx.bezierCurveTo(ox+10,oy+15,ox+16,oy+10,ox+22,oy+12); ctx.bezierCurveTo(ox+26,oy+13,ox+29,oy+17,ox+30,oy+20); ctx.bezierCurveTo(ox+31,oy+17,ox+34,oy+13,ox+38,oy+12); ctx.bezierCurveTo(ox+44,oy+10,ox+50,oy+15,ox+50,oy+22); ctx.bezierCurveTo(ox+50,oy+34,ox+40,oy+40,ox+30,oy+46); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = ornamentOpacity * 0.2;
        ctx.beginPath(); ctx.moveTo(ox+30,oy+40); ctx.bezierCurveTo(ox+20,oy+34,ox+16,oy+28,ox+16,oy+22); ctx.bezierCurveTo(ox+16,oy+18,ox+19,oy+15,ox+22,oy+16); ctx.bezierCurveTo(ox+25,oy+17,ox+28,oy+20,ox+30,oy+24); ctx.bezierCurveTo(ox+32,oy+20,ox+35,oy+17,ox+38,oy+16); ctx.bezierCurveTo(ox+41,oy+15,ox+44,oy+18,ox+44,oy+22); ctx.bezierCurveTo(ox+44,oy+28,ox+40,oy+34,ox+30,oy+40); ctx.closePath(); ctx.fill();

      } else if (ornamentType === 'wreath') {
        ctx.lineWidth = 1;
        ctx.globalAlpha = ornamentOpacity * 0.4;
        ctx.beginPath(); ctx.arc(ox+30,oy+30,16,0,Math.PI*2); ctx.stroke();
        ctx.globalAlpha = ornamentOpacity * 0.35;
        ctx.beginPath(); ctx.ellipse(ox+14,oy+30,5,8,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.ellipse(ox+46,oy+30,5,8,0,0,Math.PI*2); ctx.fill();
        ctx.save(); ctx.translate(ox+30,oy+14); ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.ellipse(0,0,5,8,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(ox+30,oy+46); ctx.rotate(Math.PI/2); ctx.beginPath(); ctx.ellipse(0,0,5,8,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.globalAlpha = ornamentOpacity * 0.25;
        ctx.save(); ctx.translate(ox+18,oy+18); ctx.rotate(Math.PI/4); ctx.beginPath(); ctx.ellipse(0,0,4,7,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(ox+42,oy+18); ctx.rotate(-Math.PI/4); ctx.beginPath(); ctx.ellipse(0,0,4,7,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(ox+18,oy+42); ctx.rotate(-Math.PI/4); ctx.beginPath(); ctx.ellipse(0,0,4,7,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.save(); ctx.translate(ox+42,oy+42); ctx.rotate(Math.PI/4); ctx.beginPath(); ctx.ellipse(0,0,4,7,0,0,Math.PI*2); ctx.fill(); ctx.restore();
        ctx.globalAlpha = ornamentOpacity * 0.6;
        ctx.beginPath(); ctx.arc(ox+30,oy+30,3,0,Math.PI*2); ctx.fill();
      }

      ctx.restore();
    }
  }

  // ── 12. Card border overlay ───────────────────────────────
  {
    const borderStyle = g('border-style')?.value || 'none';
    const borderColor = g('border-color')?.value || '#c8a068';
    const borderWidth = parseFloat(g('border-width')?.value || '3');

    if (borderStyle === 'solid') {
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, W - borderWidth, H - borderWidth);
      ctx.restore();
    } else if (borderStyle === 'double') {
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      ctx.strokeRect(borderWidth / 2, borderWidth / 2, W - borderWidth, H - borderWidth);
      ctx.lineWidth = 1;
      const gap = borderWidth + 3;
      ctx.strokeRect(gap, gap, W - gap * 2, H - gap * 2);
      ctx.restore();
    } else if (borderStyle === 'ornament') {
      ctx.save();
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = borderWidth;
      // Outer rect
      ctx.strokeRect(8, 8, W - 16, H - 16);
      // Inner rect (thinner, 50% opacity)
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.globalAlpha = 1;

      // Corner triangles
      ctx.fillStyle = borderColor;
      ctx.globalAlpha = 0.8;
      // Top-left
      ctx.beginPath(); ctx.moveTo(8, 8); ctx.lineTo(28, 8); ctx.lineTo(8, 28); ctx.closePath(); ctx.fill();
      // Top-right
      ctx.beginPath(); ctx.moveTo(W - 8, 8); ctx.lineTo(W - 28, 8); ctx.lineTo(W - 8, 28); ctx.closePath(); ctx.fill();
      // Bottom-left
      ctx.beginPath(); ctx.moveTo(8, H - 8); ctx.lineTo(28, H - 8); ctx.lineTo(8, H - 28); ctx.closePath(); ctx.fill();
      // Bottom-right
      ctx.beginPath(); ctx.moveTo(W - 8, H - 8); ctx.lineTo(W - 28, H - 8); ctx.lineTo(W - 8, H - 28); ctx.closePath(); ctx.fill();

      // Side accent lines (30% opacity)
      ctx.globalAlpha = 0.3;
      ctx.lineWidth = 1;
      ctx.strokeStyle = borderColor;
      ctx.beginPath(); ctx.moveTo(8, 50); ctx.lineTo(8, H - 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(W - 8, 50); ctx.lineTo(W - 8, H - 50); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, 8); ctx.lineTo(W - 50, 8); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(50, H - 8); ctx.lineTo(W - 50, H - 8); ctx.stroke();

      ctx.restore();
    }
  }

  return canvas;
}

async function downloadPNG() {
  showToast('Genererer PNG...');
  try {
    const canvas = await renderCardToCanvas();
    const link = document.createElement('a');
    link.download = 'invitasjon.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('PNG lastet ned!');
  } catch (e) {
    showToast('PNG-feil: ' + (e as Error).message);
  }
}

async function downloadPDF() {
  showToast('Genererer PDF...');
  try {
    const canvas = await renderCardToCanvas();
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a5' });
    pdf.addImage(imgData, 'JPEG', 0, 0, 148, 210);
    pdf.save('invitasjon-a5.pdf');
    showToast('PDF lastet ned!');
  } catch (e) {
    showToast('PDF-feil: ' + (e as Error).message);
  }
}

// ============================================================
// EMOJI PICKER COMPONENT
// ============================================================
const EMOJI_LIST = ['✝️','🎉','📍','📞','❤️','✨','🙏','🌿','⚓','🌸','🎊','📅','🕐','🎶','★','†','•','—','«','»','☀️','🌙','🕊️','🌺'];

function EmojiPicker({ onInsert }: { onInsert: (e: string) => void }) {
  return (
    <div style={{display:'flex',flexWrap:'wrap',gap:'3px',padding:'8px',background:'var(--input-bg)',border:'1px solid var(--border)',borderRadius:'6px',marginTop:'4px'}}>
      {EMOJI_LIST.map(e => (
        <button key={e} onClick={() => onInsert(e)} style={{fontSize:'15px',background:'none',border:'none',cursor:'pointer',padding:'3px 5px',borderRadius:'4px',lineHeight:1}} title={e}>{e}</button>
      ))}
    </div>
  );
}
