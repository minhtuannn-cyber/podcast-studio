import { useState, useRef, useEffect, useCallback } from 'react';
import './App.css';

const VOICE_PRESETS = [
  { id: 'hoaimy-news', name: 'Hoài My', style: 'Chuẩn Tin tức', gender: 'nữ', tags: ['Nữ', 'Tin tức', 'Podcast', 'Miền Bắc'], voice: 'vi-VN-HoaiMyNeural', rate: '+5%', pitch: '+0Hz', description: 'Giọng chuẩn, rõ ràng, phù hợp đọc bản tin Sáng/Tối.' },
  { id: 'namminh-podcast', name: 'Nam Minh', style: 'Chuẩn Podcast', gender: 'nam', tags: ['Nam', 'Podcast', 'Vlog', 'Miền Bắc'], voice: 'vi-VN-NamMinhNeural', rate: '+0%', pitch: '+0Hz', description: 'Giọng nam trầm ấm, điềm đạm, tự nhiên.' },
  { id: 'hoaimy-poetry', name: 'Quỳnh Giao', style: 'Style Đọc thơ', gender: 'nữ', tags: ['Nữ', 'Đọc thơ', 'Chậm rãi', 'Miền Bắc'], voice: 'vi-VN-HoaiMyNeural', rate: '-10%', pitch: '-5Hz', description: 'Giọng trầm buồn, chậm rãi, dạt dào cảm xúc.' },
  { id: 'namminh-ads', name: 'Đức Trung', style: 'Quảng cáo', gender: 'nam', tags: ['Nam', 'Quảng cáo', 'Podcast', 'Miền Bắc'], voice: 'vi-VN-NamMinhNeural', rate: '+5%', pitch: '-10Hz', description: 'Giọng nam cực trầm, uy lực, phù hợp trailer, quảng cáo.' },
  { id: 'hoaimy-fast', name: 'Bảo Anh', style: 'Review Tiktok', gender: 'nữ', tags: ['Nữ', 'Review', 'Năng động', 'Miền Bắc'], voice: 'vi-VN-HoaiMyNeural', rate: '+15%', pitch: '+0Hz', description: 'Giọng trẻ trung, năng động, nhịp độ nhanh.' },
  { id: 'namminh-adam', name: 'Adam', style: 'Hài hước', gender: 'nam', tags: ['Nam', 'Hài hước', 'Nhanh', 'Miền Bắc'], voice: 'vi-VN-NamMinhNeural', rate: '+25%', pitch: '+0Hz', description: 'Giọng nam cực nhanh, nhí nhảnh, tấu hài.' },
  { id: 'hoaimy-slow', name: 'Truyện Audio', style: 'Kể chuyện', gender: 'nữ', tags: ['Nữ', 'Truyện', 'Chậm rãi', 'Miền Bắc'], voice: 'vi-VN-HoaiMyNeural', rate: '-5%', pitch: '-3Hz', description: 'Giọng nữ nhẹ nhàng, phù hợp đọc truyện, sách nói.' },
  { id: 'namminh-news', name: 'Quang Anh', style: 'Thời sự VTV', gender: 'nam', tags: ['Nam', 'Tin tức', 'Thời sự', 'Miền Bắc'], voice: 'vi-VN-NamMinhNeural', rate: '+3%', pitch: '-3Hz', description: 'Style thời sự, VTV, đọc báo chuyên nghiệp.' },
  { id: 'sovits-clone-1', name: 'Giọng Vlogs (AI)', engine: 'gpt-sovits', style: 'Clone Voice', gender: 'nam', tags: ['AI Clone', 'Tự nhiên'], voice: 'sovits-1', rate: '+0%', pitch: '+0Hz', description: 'Giọng AI cực kỳ tự nhiên, sao chép bằng GPT-SoVITS.', ref_audio_path: 'sovits_refs/demo.wav', ref_text: 'Đây là giọng mẫu.', ref_lang: 'vi', text_lang: 'vi' }
];

const API = 'http://127.0.0.1:8000';

const SIDEBAR_ITEMS = [
  { id: 'editor', icon: '📝', label: 'Đọc văn bản' },
  { id: 'projects', icon: '📁', label: 'Dự án của bạn' },
  { id: 'voices', icon: '🗣️', label: 'Giọng nói cộng đồng' },
  { id: 'my-voices', icon: '🎤', label: 'Giọng nói của bạn' },
];

const BGM_TEMPLATES = [
  { file: 'ambient_calm.mp3', name: 'Ambient Calm', icon: '🌿', desc: 'Nhẹ nhàng, thiền định, phù hợp podcast chia sẻ' },
  { file: 'lofi_chill.mp3', name: 'Lo-fi Chill', icon: '☕', desc: 'Ấm áp, thư giãn, phong cách lo-fi' },
  { file: 'news_professional.mp3', name: 'News Professional', icon: '📰', desc: 'Chuyên nghiệp, phù hợp bản tin, thời sự' },
  { file: 'upbeat_energy.mp3', name: 'Upbeat Energy', icon: '⚡', desc: 'Năng động, sôi nổi, review sản phẩm' },
  { file: 'storytelling.mp3', name: 'Storytelling', icon: '📖', desc: 'Huyền bí, nhẹ nhàng, đọc truyện kể chuyện' },
];

function App() {
  const [activePage, setActivePage] = useState('editor');
  const [projectTitle, setProjectTitle] = useState('Dự án chưa có tiêu đề');
  const [blocks, setBlocks] = useState([
    { id: 1, text: '', audioUrl: null, audioFilename: null, isLoading: false, voiceId: 'hoaimy-news', duration: null }
  ]);
  const [globalVoiceId, setGlobalVoiceId] = useState('hoaimy-news');
  const [showVoiceModal, setShowVoiceModal] = useState(false);
  const [voiceModalTarget, setVoiceModalTarget] = useState(null);
  const [isPlayingAll, setIsPlayingAll] = useState(false);
  const [currentPlayingBlock, setCurrentPlayingBlock] = useState(null);
  const [isMerging, setIsMerging] = useState(false);
  const [dragOverId, setDragOverId] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [previewingId, setPreviewingId] = useState(null);
  // BGM State
  const [selectedBgm, setSelectedBgm] = useState('');
  const [bgmVolume, setBgmVolume] = useState(-20);
  const [bgmPreviewAudio, setBgmPreviewAudio] = useState(null);
  const [bgmPreviewing, setBgmPreviewing] = useState(null);
  const [showBgmPanel, setShowBgmPanel] = useState(false);
  const audioRefs = useRef({});
  const modalRef = useRef(null);
  const previewAudioRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const playAllAbort = useRef(false);

  // Custom Voice State
  const [customVoices, setCustomVoices] = useState([]);
  const [uploadName, setUploadName] = useState('');
  const [uploadText, setUploadText] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  
  // All voices combined
  const ALL_VOICES = [...VOICE_PRESETS, ...customVoices];

  // Saved projects (local state for demo)
  const [projects, setProjects] = useState([
    { id: 1, name: 'Dự án chưa có tiêu đề', preview: '', updatedAt: 'Hôm nay' }
  ]);

  useEffect(() => {
    const handler = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        setShowVoiceModal(false);
        stopPreview();
      }
    };
    if (showVoiceModal) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showVoiceModal]);

  useEffect(() => {
    fetch(`${API}/api/voices`)
      .then(r => r.json())
      .then(data => setCustomVoices(data.voices || []))
      .catch(e => console.error("Could not fetch custom voices", e));
  }, []);

  const getPreset = (id) => ALL_VOICES.find(p => p.id === id) || ALL_VOICES[0];

  const updateBlock = useCallback((id, updates) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
  }, []);

  const addBlock = () => {
    const lastVoice = blocks.length > 0 ? blocks[blocks.length - 1].voiceId : globalVoiceId;
    setBlocks(prev => [...prev, { id: Date.now(), text: '', audioUrl: null, audioFilename: null, isLoading: false, voiceId: lastVoice, duration: null }]);
  };

  const removeBlock = (id) => {
    if (blocks.length <= 1) return;
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Drag & Drop
  const handleDragStart = (e, id) => { setDragId(id); e.dataTransfer.effectAllowed = 'move'; };
  const handleDragOver = (e, id) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (e, dropId) => {
    e.preventDefault();
    if (dragId === null || dragId === dropId) { setDragOverId(null); setDragId(null); return; }
    setBlocks(prev => {
      const n = [...prev]; const di = n.findIndex(b => b.id === dragId); const dri = n.findIndex(b => b.id === dropId);
      const [d] = n.splice(di, 1); n.splice(dri, 0, d); return n;
    });
    setDragOverId(null); setDragId(null);
  };
  const handleDragEnd = () => { setDragOverId(null); setDragId(null); };

  const handlePaste = (e, id) => {
    const text = e.clipboardData.getData('text');
    if (text.includes('\n\n') || text.split('\n').filter(l => l.trim()).length > 2) {
      e.preventDefault();
      const chunks = text.split(/\n\n+/).filter(t => t.trim());
      if (chunks.length <= 1) { updateBlock(id, { text }); return; }
      setBlocks(prev => {
        const idx = prev.findIndex(b => b.id === id); const cv = prev[idx].voiceId;
        const nb = [...prev]; nb[idx] = { ...nb[idx], text: chunks[0] };
        const adds = chunks.slice(1).map((c, i) => ({ id: Date.now() + i + 1, text: c, audioUrl: null, audioFilename: null, isLoading: false, voiceId: cv, duration: null }));
        nb.splice(idx + 1, 0, ...adds); return nb;
      });
    }
  };

  const generateAudio = async (id) => {
    const block = blocks.find(b => b.id === id);
    if (!block || !block.text.trim()) return;
    const preset = getPreset(block.voiceId);
    updateBlock(id, { isLoading: true, audioUrl: null, audioFilename: null, duration: null });
    try {
      const res = await fetch(`${API}/api/generate`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: block.text, 
          voice: preset.voice, 
          rate: preset.rate, 
          pitch: preset.pitch,
          engine: preset.engine || "edge-tts",
          ref_audio_path: preset.ref_audio_path || "",
          ref_text: preset.ref_text || "",
          ref_lang: preset.ref_lang || "vi",
          text_lang: preset.text_lang || "vi"
        })
      });
      if (!res.ok) throw new Error('err');
      const data = await res.json();
      const filename = data.audioUrl.split('/').pop();
      updateBlock(id, { isLoading: false, audioUrl: `${API}${data.audioUrl}?t=${Date.now()}`, audioFilename: filename });
    } catch { updateBlock(id, { isLoading: false }); alert('Lỗi tạo audio.'); }
  };

  const generateAll = async () => {
    for (const b of blocks) { if (b.text.trim() && !b.audioUrl) await generateAudio(b.id); }
  };

  const playAll = async () => {
    const wa = blocks.filter(b => b.audioUrl); if (wa.length === 0) return;
    setIsPlayingAll(true); playAllAbort.current = false;
    for (const b of wa) {
      if (playAllAbort.current) break; setCurrentPlayingBlock(b.id);
      const a = audioRefs.current[b.id];
      if (a) { a.currentTime = 0; try { await a.play(); await new Promise(r => { a.onended = r; a.onerror = r; }); } catch {} }
    }
    setIsPlayingAll(false); setCurrentPlayingBlock(null);
  };

  const stopAll = () => {
    playAllAbort.current = true;
    Object.values(audioRefs.current).forEach(a => { if (a) { a.pause(); a.currentTime = 0; } });
    setIsPlayingAll(false); setCurrentPlayingBlock(null);
  };

  const exportAll = async () => {
    const fns = blocks.filter(b => b.audioFilename).map(b => b.audioFilename);
    if (fns.length === 0) { alert('Chưa có audio để xuất.'); return; }
    setIsMerging(true);
    try {
      const body = { filenames: fns, bgm: selectedBgm, bgm_volume: bgmVolume };
      const res = await fetch(`${API}/api/merge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error('err');
      const data = await res.json();
      const a = document.createElement('a'); a.href = `${API}${data.audioUrl}`; a.download = `${projectTitle || 'podcast'}.mp3`;
      document.body.appendChild(a); a.click(); a.remove();
    } catch { alert('Lỗi ghép audio.'); }
    setIsMerging(false);
  };

  // BGM Preview
  const previewBgm = (file) => {
    stopBgmPreview();
    setBgmPreviewing(file);
    const audio = new Audio(`${API}/api/bgm/${file}`);
    bgmAudioRef.current = audio;
    audio.volume = Math.pow(10, bgmVolume / 20); // dB to linear
    audio.onended = () => setBgmPreviewing(null);
    audio.play();
  };
  const stopBgmPreview = () => {
    if (bgmAudioRef.current) { bgmAudioRef.current.pause(); bgmAudioRef.current = null; }
    setBgmPreviewing(null);
  };

  const openVoiceModal = (target) => { setVoiceModalTarget(target); setShowVoiceModal(true); };
  const selectVoice = (voiceId) => {
    if (voiceModalTarget === 'GLOBAL') { setGlobalVoiceId(voiceId); setBlocks(prev => prev.map(b => ({ ...b, voiceId, audioUrl: null, audioFilename: null }))); }
    else { updateBlock(voiceModalTarget, { voiceId, audioUrl: null, audioFilename: null }); }
    stopPreview(); setShowVoiceModal(false);
  };

  const previewVoice = async (preset) => {
    stopPreview(); setPreviewingId(preset.id);
    try {
      const res = await fetch(`${API}/api/preview`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: '', 
          voice: preset.voice, 
          rate: preset.rate, 
          pitch: preset.pitch,
          engine: preset.engine || "edge-tts",
          ref_audio_path: preset.ref_audio_path || "",
          ref_text: preset.ref_text || "",
          ref_lang: preset.ref_lang || "vi",
          text_lang: preset.text_lang || "vi"
        }) 
      });
      if (!res.ok) throw new Error('err');
      const data = await res.json();
      const audio = new Audio(`${API}${data.audioUrl}?t=${Date.now()}`);
      previewAudioRef.current = audio; audio.onended = () => setPreviewingId(null); audio.play();
    } catch { setPreviewingId(null); }
  };
  const stopPreview = () => { if (previewAudioRef.current) { previewAudioRef.current.pause(); previewAudioRef.current = null; } setPreviewingId(null); };

  const totalChars = blocks.reduce((s, b) => s + b.text.length, 0);
  const blocksWithAudio = blocks.filter(b => b.audioUrl).length;

  return (
    <div className="layout">
      {/* ===== Sidebar ===== */}
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="sidebar-logo-icon">🎙️</span>
          <span className="sidebar-logo-text">PodStudio</span>
        </div>
        <nav className="sidebar-nav">
          {SIDEBAR_ITEMS.map(item => (
            <button key={item.id} className={`sidebar-item ${activePage === item.id ? 'active' : ''}`} onClick={() => setActivePage(item.id)}>
              <span className="sidebar-item-icon">{item.icon}</span>
              <span className="sidebar-item-label">{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">U</div>
            <span className="sidebar-user-name">Người dùng</span>
          </div>
        </div>
      </aside>

      {/* ===== Main Content ===== */}
      <main className="main-content">
        {activePage === 'projects' && (
          <div className="page-projects">
            <div className="page-header">
              <div>
                <h1 className="page-title">Dự án của bạn</h1>
                <p className="page-subtitle">Quản lý và chỉnh sửa các dự án văn bản của bạn</p>
              </div>
              <button className="btn-create-project" onClick={() => setActivePage('editor')}>+ Tạo dự án mới</button>
            </div>
            <div className="projects-table">
              <div className="projects-table-header">
                <span>Tên</span><span>Cập nhật lần cuối</span><span></span>
              </div>
              {projects.map(p => (
                <div key={p.id} className="project-row" onClick={() => setActivePage('editor')}>
                  <div className="project-row-info">
                    <div className="project-row-name">{projectTitle}</div>
                    <div className="project-row-preview">{blocks[0]?.text?.slice(0, 80) || 'Chưa có nội dung...'}</div>
                  </div>
                  <span className="project-row-date">{p.updatedAt}</span>
                  <button className="project-row-menu">⋯</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePage === 'voices' && (
          <div className="page-voices">
            <h1 className="page-title">Giọng nói cộng đồng</h1>
            <p className="page-subtitle">Khám phá các giọng nói do cộng đồng đóng góp</p>
            <div className="voice-grid">
              {VOICE_PRESETS.map(p => (
                <div key={p.id} className="voice-community-card">
                  <div className="vcc-top"><h3>{p.name} ({p.style})</h3><p>{p.description}</p></div>
                  <div className="vcc-tags">{p.tags.map(t => <span key={t} className="vcc-tag">{t}</span>)}</div>
                  <button className="vcc-play" onClick={() => previewVoice(p)}>{previewingId === p.id ? '⏹ Dừng' : '▶ Nghe thử'}</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activePage === 'editor' && (
          <>
            {/* Toolbar */}
            <div className="toolbar">
              <div className="toolbar-left">
                <input className="project-title-input" value={projectTitle} onChange={e => setProjectTitle(e.target.value)} placeholder="Tên dự án..." />
              </div>
              <div className="toolbar-right">
                <div className="stat-badge">{blocks.length} đoạn</div>
                <div className="stat-badge">{totalChars.toLocaleString()} ký tự</div>
                <button className="btn-tb" onClick={() => openVoiceModal('GLOBAL')}>🗣️ {getPreset(globalVoiceId).name} ▼</button>
              </div>
            </div>

            {/* Action Bar */}
            <div className="action-bar">
              <button className="btn-action primary" onClick={generateAll}>⚡ Tạo tất cả</button>
              {!isPlayingAll
                ? <button className="btn-action" onClick={playAll} disabled={blocksWithAudio === 0}>▶ Phát tất cả</button>
                : <button className="btn-action danger" onClick={stopAll}>⏹ Dừng</button>
              }
              <button className="btn-action export" onClick={exportAll} disabled={blocksWithAudio === 0 || isMerging}>
                {isMerging ? '⏳ Đang xuất...' : '📥 Xuất toàn bộ'}
              </button>
              <button className={`btn-action ${showBgmPanel ? 'bgm-active' : ''}`} onClick={() => setShowBgmPanel(!showBgmPanel)}>
                🎵 Nhạc nền {selectedBgm ? '✓' : ''}
              </button>
              <div style={{flex:1}}></div>
              <button className="btn-action" onClick={addBlock}>+ Thêm đoạn</button>
            </div>

            {/* BGM Panel */}
            {showBgmPanel && (
              <div className="bgm-panel">
                <div className="bgm-panel-header">
                  <h3>🎵 Nhạc nền cho Podcast</h3>
                  <p>Chọn nhạc nền sẽ được trộn khi xuất file toàn bộ</p>
                </div>
                <div className="bgm-cards">
                  {/* No music option */}
                  <div className={`bgm-card ${selectedBgm === '' ? 'selected' : ''}`} onClick={() => { setSelectedBgm(''); stopBgmPreview(); }}>
                    <div className="bgm-card-icon">🔇</div>
                    <div className="bgm-card-info"><h4>Không nhạc nền</h4><p>Chỉ xuất giọng nói</p></div>
                    <div className={`bgm-radio ${selectedBgm === '' ? 'checked' : ''}`}>{selectedBgm === '' && <div className="bgm-radio-dot"></div>}</div>
                  </div>
                  {BGM_TEMPLATES.map(bgm => (
                    <div key={bgm.file} className={`bgm-card ${selectedBgm === bgm.file ? 'selected' : ''}`}
                      onClick={() => setSelectedBgm(bgm.file)}>
                      <div className="bgm-card-icon">{bgm.icon}</div>
                      <div className="bgm-card-info">
                        <h4>{bgm.name}</h4>
                        <p>{bgm.desc}</p>
                      </div>
                      <div className="bgm-card-actions">
                        <button className={`bgm-preview-btn ${bgmPreviewing === bgm.file ? 'active' : ''}`}
                          onClick={e => { e.stopPropagation(); bgmPreviewing === bgm.file ? stopBgmPreview() : previewBgm(bgm.file); }}>
                          {bgmPreviewing === bgm.file ? '⏹' : '▶'}
                        </button>
                        <div className={`bgm-radio ${selectedBgm === bgm.file ? 'checked' : ''}`}>
                          {selectedBgm === bgm.file && <div className="bgm-radio-dot"></div>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {selectedBgm && (
                  <div className="bgm-volume-row">
                    <label>🔊 Âm lượng nhạc nền:</label>
                    <input type="range" min={-40} max={-5} value={bgmVolume} onChange={e => setBgmVolume(parseInt(e.target.value))} />
                    <span className="bgm-vol-val">{bgmVolume} dB</span>
                  </div>
                )}
              </div>
            )}

            {/* Editor Blocks */}
            <div className="editor-area">
              {blocks.map((block, index) => {
                const preset = getPreset(block.voiceId);
                const isPlaying = currentPlayingBlock === block.id;
                return (
                  <div className={`block ${isPlaying ? 'playing' : ''} ${dragOverId === block.id ? 'drag-over' : ''}`}
                    key={block.id} draggable onDragStart={e => handleDragStart(e, block.id)}
                    onDragOver={e => handleDragOver(e, block.id)} onDrop={e => handleDrop(e, block.id)} onDragEnd={handleDragEnd}>
                    <div className="block-header">
                      <div className="block-header-l">
                        <span className="drag-handle">⠿</span>
                        <span className="block-num">{index + 1}</span>
                        <button className="voice-chip" onClick={() => openVoiceModal(block.id)}>
                          {preset.name} ({preset.style}) ▼
                        </button>
                      </div>
                      <button className="btn-del" onClick={() => removeBlock(block.id)} disabled={blocks.length <= 1}>🗑</button>
                    </div>
                    <div className="block-body">
                      <div className="block-text">
                        <textarea value={block.text} onChange={e => updateBlock(block.id, { text: e.target.value })}
                          onPaste={e => handlePaste(e, block.id)} placeholder="Nhập hoặc dán nội dung văn bản vào đây..." rows={4} />
                        <span className="block-chars">{block.text.length} ký tự</span>
                      </div>
                      <div className="block-audio">
                        <button className={`btn-gen ${block.isLoading ? 'loading' : ''}`}
                          onClick={() => generateAudio(block.id)} disabled={block.isLoading || !block.text.trim()}>
                          {block.isLoading ? '⏳ Đang tạo...' : '🔊 Tạo giọng nói'}
                        </button>
                        {block.audioUrl && (
                          <div className="audio-result">
                            <audio ref={el => audioRefs.current[block.id] = el} src={block.audioUrl} controls
                              onLoadedMetadata={e => updateBlock(block.id, { duration: e.target.duration })} />
                            <div className="audio-meta">
                              {block.duration && <span className="dur">{Math.floor(block.duration)}s</span>}
                              <a href={block.audioUrl} download={`doan_${index+1}.mp3`} className="dl-link">⬇ Tải xuống</a>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <button className="btn-add-block" onClick={addBlock}><span className="plus-icon">+</span> Thêm đoạn mới</button>
            </div>
          </>
        )}

        {(activePage === 'my-voices') && (
          <div className="page-voices">
            <h1 className="page-title">Giọng nói của bạn</h1>
            <p className="page-subtitle">Sao chép giọng nói của bạn bằng công nghệ GPT-SoVITS</p>
            <div className="clone-voice-box">
              <div className="clone-icon">🎙️</div>
              <h3>Thêm Giọng Nói Mới</h3>
              <p>Tải lên một đoạn ghi âm dài 3-10 giây để AI sao chép giọng điệu và chất giọng của bạn.</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!uploadFile || !uploadName.trim() || !uploadText.trim()) return;
                setIsUploading(true);
                const fd = new FormData();
                fd.append('name', uploadName);
                fd.append('ref_text', uploadText);
                fd.append('file', uploadFile);
                try {
                  const res = await fetch(`${API}/api/voices`, { method: 'POST', body: fd });
                  if (!res.ok) throw new Error('Failed to upload');
                  const data = await res.json();
                  setCustomVoices(prev => [...prev, data.voice]);
                  setUploadName(''); setUploadText(''); setUploadFile(null);
                  alert('Tạo giọng clone thành công! Hãy vào tab Đọc văn bản để sử dụng.');
                } catch (e) {
                  alert('Lỗi: ' + e.message);
                }
                setIsUploading(false);
              }} className="clone-form">
                <input type="text" placeholder="Tên giọng nói (VD: Giọng Tự Nhiên)" value={uploadName} onChange={e => setUploadName(e.target.value)} required />
                <textarea placeholder="Nội dung văn bản mà đoạn ghi âm đang nói..." value={uploadText} onChange={e => setUploadText(e.target.value)} required rows={3}></textarea>
                <input type="file" accept="audio/wav,audio/mp3,audio/mpeg,audio/m4a" onChange={e => setUploadFile(e.target.files[0])} required />
                <button type="submit" className="btn-upload" disabled={isUploading}>{isUploading ? 'Đang tải lên...' : 'Tạo Giọng'}</button>
              </form>
            </div>
            
            <div className="custom-voices-list">
              <h2 style={{marginTop: '40px', color: '#fff'}}>Giọng đã tạo</h2>
              {customVoices.length === 0 ? (
                <p className="text-muted">Bạn chưa tạo giọng nào.</p>
              ) : (
                <div className="cv-grid">
                  {customVoices.map(cv => (
                    <div key={cv.id} className="cv-card">
                      <span className="cv-icon">🔊</span>
                      <strong>{cv.name}</strong>
                      <span className="engine-badge sovits" style={{marginTop: '8px', display: 'inline-block'}}>GPT-SoVITS</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* ===== Voice Modal (Dark Theme like Vivibe) ===== */}
      {showVoiceModal && (
        <div className="modal-overlay">
          <div className="voice-modal" ref={modalRef}>
            <div className="vm-header">
              <h2>Chọn giọng nói</h2>
              <button className="vm-close" onClick={() => { setShowVoiceModal(false); stopPreview(); }}>✕</button>
            </div>
            <div className="vm-list">
              {ALL_VOICES.map(preset => {
                const currentVoiceId = voiceModalTarget === 'GLOBAL' ? globalVoiceId : blocks.find(b => b.id === voiceModalTarget)?.voiceId;
                const isSelected = currentVoiceId === preset.id;
                const isPreviewing = previewingId === preset.id;
                return (
                  <div key={preset.id} className={`vm-card ${isSelected ? 'selected' : ''}`} onClick={() => selectVoice(preset.id)}>
                    <div className="vm-card-info">
                      <h3>
                        {preset.name} ({preset.style})
                        {preset.engine === 'gpt-sovits' ? 
                          <span className="engine-badge sovits">GPT-SoVITS</span> : 
                          <span className="engine-badge edge">Edge-TTS</span>}
                      </h3>
                      <p>{preset.description}</p>
                      <div className="vm-card-tags">
                        {preset.tags.map(t => <span key={t} className={`vm-tag ${t === 'Nam' || t === 'Nữ' ? 'gender' : ''}`}>{t}</span>)}
                      </div>
                    </div>
                    <div className="vm-card-actions">
                      <button className={`vm-preview-btn ${isPreviewing ? 'active' : ''}`}
                        onClick={e => { e.stopPropagation(); isPreviewing ? stopPreview() : previewVoice(preset); }}>
                        {isPreviewing ? '⏹' : '▶'}
                      </button>
                      <div className={`vm-radio ${isSelected ? 'checked' : ''}`}>
                        {isSelected && <div className="vm-radio-dot"></div>}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
