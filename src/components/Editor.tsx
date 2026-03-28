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
  borderColor: string; grassColor: string;
  fonts: Record<string, string>; sizes: Record<string, number>;
  field_colors: Record<string, string>; rsvpBg: string; rsvpBorderColor: string;
}> = {
  stadion: {
    bgColor: '#0d1b2a', fadeColor: '#0d1b2a', badgeBg: '#c9a432',
    dividerColor: '#c9a432', borderColor: '#c9a432', grassColor: '#1a4a0e',
    fonts: { topline: 'Oswald', intro: 'Lato', name: 'Playfair Display', subtitle: 'Lato', date: 'Oswald', program: 'Lato', greeting: 'Playfair Display', rsvp: 'Lato' },
    sizes: { topline: 10, intro: 13, name: 36, subtitle: 13, date: 13, program: 12, greeting: 20, rsvp: 11 },
    field_colors: { topline: '#c9a432', intro: '#a0a8c0', name: '#e8eaf8', subtitle: '#c9a432', date: '#0d1b2a', program: '#c0c8e0', greeting: '#c9a432', rsvp: '#e0e4f0' },
    rsvpBg: '#12253a', rsvpBorderColor: '#c9a432',
  },
  klassisk: {
    bgColor: '#faf8f4', fadeColor: '#faf8f4', badgeBg: '#1a3a6e',
    dividerColor: '#1a3a6e', borderColor: '#1a3a6e', grassColor: '#2d6b1a',
    fonts: { topline: 'Cinzel', intro: 'Cormorant Garamond', name: 'Playfair Display', subtitle: 'Cormorant Garamond', date: 'Cinzel', program: 'Cormorant Garamond', greeting: 'Playfair Display', rsvp: 'Cormorant Garamond' },
    sizes: { topline: 11, intro: 15, name: 38, subtitle: 15, date: 12, program: 13, greeting: 22, rsvp: 12 },
    field_colors: { topline: '#1a3a6e', intro: '#3a3a5e', name: '#1a1a2e', subtitle: '#1a3a6e', date: '#ffffff', program: '#2a2a4e', greeting: '#1a3a6e', rsvp: '#1a1a2e' },
    rsvpBg: '#eef0f8', rsvpBorderColor: '#1a3a6e',
  },
  natur: {
    bgColor: '#fdf6ec', fadeColor: '#fdf6ec', badgeBg: '#8b5a2b',
    dividerColor: '#c8a068', borderColor: '#c8a068', grassColor: '#2d8a1b',
    fonts: { topline: 'Oswald', intro: 'EB Garamond', name: 'Playfair Display', subtitle: 'EB Garamond', date: 'Lato', program: 'EB Garamond', greeting: 'Dancing Script', rsvp: 'Lato' },
    sizes: { topline: 11, intro: 14, name: 38, subtitle: 15, date: 13, program: 12, greeting: 22, rsvp: 11 },
    field_colors: { topline: '#8b5a2b', intro: '#5a3a1a', name: '#2c1a0e', subtitle: '#8b5a2b', date: '#ffffff', program: '#3a2010', greeting: '#8b5a2b', rsvp: '#2c1a0e' },
    rsvpBg: '#f0e8d8', rsvpBorderColor: '#c8a068',
  }
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
  portrait: 'Portrettbilde', grass: 'Gresstripe', cutout: 'Cutout-bilde',
};

export default function Editor() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [saveVersion, setSaveVersion] = useState(0);
  const [saveEnabled, setSaveEnabled] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState('default');
  const [projectNameInput, setProjectNameInput] = useState('');
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [savedProjects, setSavedProjects] = useState<{ id: string; updated_at: string }[]>([]);
  const currentProjectIdRef = useRef('default');
  currentProjectIdRef.current = currentProjectId;

  const triggerSave = useCallback(() => {
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
    w.updateGrass = updateGrass;
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

        <SaveStatusBar status={status} />

        <div id="template-section">
          <h2>Mal</h2>
          <div className="template-cards">
            <div className="tpl-card" id="tpl-stadion" onClick={() => { applyTemplate('stadion'); triggerSave(); }}>STADION<span>Mørk/Gull</span></div>
            <div className="tpl-card" id="tpl-klassisk" onClick={() => { applyTemplate('klassisk'); triggerSave(); }}>KLASSISK<span>Lys/Navy</span></div>
            <div className="tpl-card active" id="tpl-natur" onClick={() => { applyTemplate('natur'); triggerSave(); }}>NATUR<span>Varm/Jord</span></div>
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
            <div className="section-label">Gresstripe</div>
            <div className="ctrl-row">
              <label>Vis gresstripe</label>
              <input type="checkbox" id="grass-visible" defaultChecked onChange={() => { updateGrass(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Gress-farge</label>
              <input type="color" id="grass-color" defaultValue="#2d8a1b" onChange={() => { updateGrass(); triggerSave(); }} />
            </div>

            <div className="sep"></div>
            <div className="section-label">Ornament</div>
            <div className="ctrl-row">
              <label>Vis ornament</label>
              <input type="checkbox" id="ornament-visible" onChange={() => { updateOrnament(); triggerSave(); }} />
            </div>
            <div className="ctrl-row">
              <label>Ornament-farge</label>
              <input type="color" id="ornament-color" defaultValue="#c8a068" onChange={() => { updateOrnament(); triggerSave(); }} />
            </div>
          </div>

        </div>

        <div id="save-section">
          <div id="pos-readout" style={{fontSize:'10px',color:'var(--accent)',minHeight:'14px',letterSpacing:'0.5px',marginBottom:'4px'}}></div>
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
        <div id="card-wrapper">
          <div id="invite-card">
            <div id="bg-img-layer"></div>
            <div id="bg-color-layer"></div>
            <div id="el-portrait" className="card-el" data-el="portrait" style={{display:'none',width:'559px',height:'302px',backgroundSize:'cover',backgroundPosition:'center 20%',backgroundRepeat:'no-repeat'}}></div>
            <div id="el-portrait-placeholder" style={{position:'absolute',top:0,left:0,width:'100%',height:'302px',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text-muted)',fontSize:'13px',cursor:'pointer',background:'rgba(200,200,200,0.08)',border:'2px dashed var(--border)',zIndex:3}} onClick={() => (document.getElementById('main-upload') as HTMLInputElement)?.click()}>+ Klikk for å laste opp portrettfoto</div>
            <div id="el-portrait-fade" style={{position:'absolute',pointerEvents:'none',width:'100%',height:'120px',zIndex:4}}></div>
            <svg id="el-grass" className="card-el" data-el="grass" viewBox="0 0 559 50" preserveAspectRatio="none" style={{width:'559px',height:'50px'}}></svg>
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
            <div id="card-border-overlay"></div>
            <div id="ornament"></div>
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
            <textarea id={`in-${fieldKey}`} defaultValue={FIELD_DEFAULTS[fieldKey]} onInput={() => { syncField(fieldKey); onChange(); }} />
          ) : (
            <input type="text" id={`in-${fieldKey}`} defaultValue={FIELD_DEFAULTS[fieldKey]} onInput={() => { syncField(fieldKey); onChange(); }} />
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
const editorState = {
  template: 'natur',
  mainImage: null as string | null,
  cutoutImage: null as string | null,
  cutoutOriginalSrc: null as string | null,
  bgImage: null as string | null,
  bgColorForRemoval: null as string | null,
  rsvpTransparent: false,
  fields: Object.fromEntries(FIELD_KEYS.map(k => [k, { bold: false, italic: k === 'intro' || k === 'subtitle' }])),
  moduleOrder: [...DEFAULT_MODULE_ORDER],
  selectedElement: null as string | null,
  positions: {
    portrait:  { x: 0,   y: 0,   z: 3  },
    grass:     { x: 0,   y: 282, z: 5  },
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
  const scale = Math.min(aW / 559, aH / 794, 1);
  currentCardScale = scale;
  wrapper.style.transform = `scale(${currentCardScale})`;
  wrapper.style.marginTop = `-${(794 * (1 - scale)) / 2}px`;
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
    if (el) { el.style.height = divW + 'px'; el.style.background = divColor; }
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
  editorState.positions.grass.y = h - 20;
  applyPosition('grass');
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

function generateGrass(baseColor: string) {
  const svg = document.getElementById('el-grass');
  if (!svg) return;
  const r = parseInt(baseColor.slice(1, 3), 16);
  const gr = parseInt(baseColor.slice(3, 5), 16);
  const b = parseInt(baseColor.slice(5, 7), 16);
  let html = `<rect width="559" height="50" fill="rgb(${Math.max(0, r - 40)},${Math.max(0, gr - 40)},${Math.max(0, b - 40)})"/>`;
  for (let i = 0; i < 180; i++) {
    const x = (i / 180) * 559 + (Math.random() - 0.5) * 6;
    const h = 15 + Math.random() * 26;
    const w = 2 + Math.random() * 3;
    const rot = (Math.random() - 0.5) * 20;
    const brightness = 0.85 + Math.random() * 0.3;
    const c2 = `rgb(${Math.min(255, Math.round(r * brightness))},${Math.min(255, Math.round(gr * brightness))},${Math.min(255, Math.round(b * brightness))})`;
    html += `<g transform="translate(${x.toFixed(1)},50) rotate(${rot.toFixed(1)})"><polygon points="-${(w / 2).toFixed(1)},0 ${(w / 2).toFixed(1)},0 ${(w / 4).toFixed(1)},-${h.toFixed(1)} -${(w / 4).toFixed(1)},-${h.toFixed(1)}" fill="${c2}"/></g>`;
  }
  for (let i = 0; i < 80; i++) {
    const x = (i / 80) * 559 + (Math.random() - 0.5) * 8;
    const h = 10 + Math.random() * 15;
    const w = 2.5 + Math.random() * 2;
    const rot = (Math.random() - 0.5) * 15;
    const darkness = 0.6 + Math.random() * 0.2;
    const c2 = `rgb(${Math.min(255, Math.round(r * darkness))},${Math.min(255, Math.round(gr * darkness))},${Math.min(255, Math.round(b * darkness))})`;
    html += `<g transform="translate(${x.toFixed(1)},50) rotate(${rot.toFixed(1)})"><polygon points="-${(w / 2).toFixed(1)},0 ${(w / 2).toFixed(1)},0 0,-${h.toFixed(1)}" fill="${c2}"/></g>`;
  }
  svg.innerHTML = html;
}

function updateGrass() {
  const visible = (g('grass-visible') as HTMLInputElement)?.checked;
  const color = g('grass-color')?.value || '#2d8a1b';
  const layer = document.getElementById('el-grass');
  if (layer) layer.style.display = visible ? 'block' : 'none';
  if (visible) generateGrass(color);
}

function updateOrnament() {
  const visible = (g('ornament-visible') as HTMLInputElement)?.checked;
  const color = g('ornament-color')?.value || '#c8a068';
  const el = document.getElementById('ornament');
  if (!el) return;
  el.style.display = visible ? 'block' : 'none';
  if (visible) {
    el.style.bottom = '60px'; el.style.right = '20px';
    el.style.width = '60px'; el.style.height = '60px';
    el.innerHTML = `<svg viewBox="0 0 60 60" fill="${color}" xmlns="http://www.w3.org/2000/svg">
      <circle cx="30" cy="30" r="28" fill="none" stroke="${color}" stroke-width="1.5"/>
      <path d="M30 8 C20 14 10 22 10 30 C10 42 20 52 30 52 C40 52 50 42 50 30 C50 22 40 14 30 8Z" fill="${color}" opacity="0.15"/>
      <ellipse cx="22" cy="26" rx="6" ry="9" fill="${color}" opacity="0.4" transform="rotate(-25,22,26)"/>
      <ellipse cx="38" cy="26" rx="6" ry="9" fill="${color}" opacity="0.4" transform="rotate(25,38,26)"/>
      <ellipse cx="30" cy="36" rx="6" ry="8" fill="${color}" opacity="0.4"/>
    </svg>`;
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
  g('grass-color').value = t.grassColor;
  generateGrass(t.grassColor);
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

  if (name === 'natur' || name === 'klassisk') {
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
    item.innerHTML = `<span class="drag-handle">⠿</span><span class="drag-label">${MODULE_LABELS[key] || key}</span>`;
    list.appendChild(item);
  });
  attachDragHandlers(list, triggerSave);
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
  const el = id === 'cutout' ? document.getElementById('cutout-img') : document.getElementById('el-' + id);
  if (!el) return;
  const pos = editorState.positions[id];
  if (!pos) return;
  (el as HTMLElement).style.left = pos.x + 'px';
  (el as HTMLElement).style.top = pos.y + 'px';
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
  } else if (id === 'grass' || id.startsWith('divider')) {
    switchTab('design');
  }
  const readout = document.getElementById('pos-readout');
  if (readout) {
    const pos = editorState.positions[id];
    readout.textContent = pos ? `${MODULE_LABELS[id] || id}: X ${Math.round(pos.x)} · Y ${Math.round(pos.y)}` : '';
  }
}

function attachCardDrag(id: string, triggerSave: () => void) {
  const el = id === 'cutout' ? document.getElementById('cutout-img') : document.getElementById('el-' + id);
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
    editorState.positions[id].x = Math.round(origX + dx);
    editorState.positions[id].y = Math.round(origY + dy);
    applyPosition(id);
    const readout = document.getElementById('pos-readout');
    if (readout) readout.textContent = `${MODULE_LABELS[id] || id}: X ${Math.round(editorState.positions[id].x)} · Y ${Math.round(editorState.positions[id].y)}`;
  });

  htmlEl.addEventListener('pointerup', (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    htmlEl.releasePointerCapture(e.pointerId);
    triggerSave();
  });
}

function attachAllCardDrag(triggerSave: () => void) {
  ['portrait','grass','topline','divider1','intro','name','subtitle','datebadge','divider2','program','divider3','greeting','rsvp','cutout'].forEach(id => attachCardDrag(id, triggerSave));
}

function resetLayout() {
  editorState.positions = {
    portrait:  { x: 0,   y: 0,   z: 3  },
    grass:     { x: 0,   y: 282, z: 5  },
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
      grassVisible: (g('grass-visible') as HTMLInputElement)?.checked,
      grassColor: g('grass-color')?.value,
      ornamentVisible: (g('ornament-visible') as HTMLInputElement)?.checked,
      ornamentColor: g('ornament-color')?.value,
      rsvpBg: g('rsvp-bg')?.value,
      rsvpBorderColor: g('rsvp-border-color')?.value,
      rsvpBorderW: g('rsvp-border-w')?.value,
      rsvpBorderStyle: g('rsvp-border-style')?.value,
      rsvpRadius: g('rsvp-radius')?.value,
      rsvpPadding: g('rsvp-padding')?.value,
      rsvpVisible: (g('rsvp-visible') as HTMLInputElement)?.checked,
      rsvpTransparent: editorState.rsvpTransparent,
    },
    removebgKey: g('removebg-key')?.value,
    moduleOrder: [...editorState.moduleOrder],
    positions: JSON.parse(JSON.stringify(editorState.positions)),
  };
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
    const gv = g('grass-visible') as HTMLInputElement;
    if (gv) gv.checked = c.grassVisible !== false;
    if (c.grassColor) g('grass-color').value = c.grassColor as string;
    const ov = g('ornament-visible') as HTMLInputElement;
    if (ov) ov.checked = !!c.ornamentVisible;
    if (c.ornamentColor) g('ornament-color').value = c.ornamentColor as string;
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
    updateGrass();
    updateOrnament();
  }

  if (data.moduleOrder && Array.isArray(data.moduleOrder)) {
    editorState.moduleOrder = data.moduleOrder as string[];
    renderModuleOrderUI();
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
      ctx.beginPath();
      ctx.rect(portraitPos.x, portraitPos.y, W - portraitPos.x, th);
      ctx.clip();
      ctx.drawImage(portImg, imgX, imgY, scaledW, scaledH);
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

  // ── 5. Grass SVG ─────────────────────────────────────────
  const grassVisible = (g('grass-visible') as HTMLInputElement)?.checked !== false;
  if (grassVisible) {
    const grassEl = document.getElementById('el-grass');
    if (grassEl && grassEl.style.display !== 'none') {
      try {
        const serializer = new XMLSerializer();
        const svgData = serializer.serializeToString(grassEl);
        const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(svgBlob);
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.onload = () => {
            const gp = editorState.positions.grass || { x: 0, y: 282 };
            ctx.drawImage(img, gp.x, gp.y, 559, 50);
            URL.revokeObjectURL(url);
            resolve();
          };
          img.onerror = () => { URL.revokeObjectURL(url); resolve(); };
          img.src = url;
        });
      } catch (_e) {
        // ignore grass render failure
      }
    }
  }

  // ── 6 & 7. Text fields and dividers ──────────────────────
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
  drawDivider('divider1');
  drawDivider('divider2');
  drawDivider('divider3');

  // Draw text fields (all except 'date' which is handled as badge)
  for (const key of ['topline', 'intro', 'name', 'subtitle', 'program', 'greeting', 'rsvp']) {
    await drawTextField(key);
  }

  // ── 8. Date badge ─────────────────────────────────────────
  {
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

  // ── 11. Card border overlay ───────────────────────────────
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
