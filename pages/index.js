import { useState, useEffect } from 'react';

export default function AdVault() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  
  // View States
  const [view, setView] = useState('gallery'); // 'gallery', 'add', 'detail'
  const [activeCampaign, setActiveCampaign] = useState(null); 
  const [currentSlide, setCurrentSlide] = useState(0); // For Carousel
  
  // Filter State
  const [activeTag, setActiveTag] = useState(''); 
  
  // Analysis & Form State
  const [url, setUrl] = useState('');
  const [userTags, setUserTags] = useState(''); 
  const [step, setStep] = useState('input'); 
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Edit State
  const [editingId, setEditingId] = useState(null);
  const [editTags, setEditTags] = useState('');

  // 1. INITIALIZATION & LOGIN
  useEffect(() => {
    const savedPass = localStorage.getItem('ADVAULT_PASS');
    if (savedPass) { setPassword(savedPass); handleLogin(null, savedPass); }
  }, []);

  // 2. CAROUSEL TIMER (Auto-move every 2.5s)
  useEffect(() => {
    let timer;
    if (view === 'detail' && activeCampaign?.image_urls?.length > 1) {
      timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % activeCampaign.image_urls.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [view, activeCampaign]);

  async function handleLogin(e, passOverride) {
    if (e) e.preventDefault();
    const passToUse = passOverride || password;
    try {
      const res = await fetch('/api/fetch', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: passToUse }) });
      const json = await res.json();
      if (!json.error) { setCampaigns(json.data); setIsLoggedIn(true); localStorage.setItem('ADVAULT_PASS', passToUse); }
    } catch (err) {}
  }

  async function handleAnalyze(e) {
    e.preventDefault(); setStep('loading'); setLoadingMsg("🕵️‍♂️ Creative Director is analyzing...");
    const res = await fetch('/api/analyze', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url, password }) });
    const json = await res.json();
    if (json.error) { alert(json.error); setStep('input'); } 
    else { setAnalysis(json.strategy); if (json.images.length > 0) setSelectedImages([json.images[0]]); window.tempImages = json.images; setStep('review'); }
  }

  async function handleSave() {
    const processedTags = processTags(userTags);
    const finalData = { ...analysis, tags: processedTags, source_url: url, image_urls: selectedImages };
    const res = await fetch('/api/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ data: finalData, password }) });
    if (res.ok) { handleLogin(null, password); setView('gallery'); setStep('input'); setUrl(''); setUserTags(''); setAnalysis(null); }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this campaign?")) return;
    const res = await fetch('/api/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, password }) });
    if (res.ok) { handleLogin(null, password); if(view === 'detail') setView('gallery'); }
  }

  function startEditing(camp) { setEditingId(camp.id); setEditTags(camp.tags || ''); }
  async function saveEdit(id) {
    const processedTags = processTags(editTags);
    const res = await fetch('/api/update', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, tags: processedTags, password }) });
    if (res.ok) { setEditingId(null); handleLogin(null, password); }
  }

  function processTags(str) { return str.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 3).join(', '); }
  function toggleImage(img) { if (selectedImages.includes(img)) setSelectedImages(selectedImages.filter(i => i !== img)); else setSelectedImages([...selectedImages, img]); }

  function openDetail(camp) {
    setActiveCampaign(camp);
    setCurrentSlide(0); // Reset carousel to start
    setView('detail');
  }

  // Filter Logic
  const allManualTags = campaigns.flatMap(c => c.tags ? c.tags.split(',') : []).map(t => t.trim());
  const uniqueFilters = [...new Set(allManualTags)].sort();
  const filteredCampaigns = campaigns.filter(c => {
    if (!activeTag) return true;
    return c.tags && c.tags.includes(activeTag);
  });

  if (!isLoggedIn) return <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111', color:'white'}}><form onSubmit={e => handleLogin(e, null)}><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{padding:'15px', borderRadius:'5px'}} /><button style={{padding:'15px'}}>Unlock</button></form></div>;

  return (
    <div style={{fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh', paddingBottom:'50px'}}>
      
      {/* HEADER */}
      <div style={{background: 'white', padding: '20px', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 100}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'15px'}}>
          <h2 style={{margin:0, cursor:'pointer'}} onClick={() => {setView('gallery'); setActiveTag('');}}>AdVault 🧠</h2>
          {view === 'gallery' && <button onClick={() => setView('add')} style={{background: 'black', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'}}>+ Add</button>}
        </div>
        {view === 'gallery' && (
          <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth:'none'}}>
            <button onClick={() => setActiveTag('')} style={activeTag === '' ? activePill : pill}>All</button>
            {uniqueFilters.map(f => <button key={f} onClick={() => setActiveTag(f)} style={activeTag === f ? activePill : pill}>{f}</button>)}
          </div>
        )}
      </div>

      {/* GALLERY VIEW */}
      {view === 'gallery' && (
        <div style={{padding: '20px', columnCount: 3, columnGap: '20px'}}>
          {filteredCampaigns.map(camp => (
            <div key={camp.id} style={{background: 'white', borderRadius: '10px', marginBottom: '20px', breakInside: 'avoid', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position:'relative'}}>
              {camp.image_urls && camp.image_urls[0] && <img src={camp.image_urls[0]} style={{width: '100%', display: 'block'}} />}
              <div style={{padding: '15px'}}>
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div style={{fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '5px'}}>{camp.brand}</div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => startEditing(camp)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#ccc'}}>✎</button>
                    <button onClick={() => handleDelete(camp.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:'18px'}}>×</button>
                  </div>
                </div>
                <h3 style={{margin: '0 0 5px 0', fontSize: '18px'}}>{camp.title || 'Untitled'}</h3>
                <p style={{fontSize: '13px', color: '#444', lineHeight:'1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{camp.insight}</p>
                <button onClick={() => openDetail(camp)} style={{background:'none', border:'none', color:'#0070f3', padding:0, fontSize:'13px', cursor:'pointer', marginBottom:'10px'}}>Read More →</button>
                {editingId === camp.id ? (
                  <div><input value={editTags} onChange={e => setEditTags(e.target.value)} style={{width:'100%', padding:'5px'}} /><button onClick={() => saveEdit(camp.id)}>Save</button></div>
                ) : (
                  <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop:'10px'}}>
                    {camp.tags && camp.tags.split(',').map((tag, i) => <span key={i} style={{background: '#eee', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', textTransform:'uppercase'}}>{tag}</span>)}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* DETAIL MODAL (CASE STUDY) */}
      {view === 'detail' && activeCampaign && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.85)', zIndex:200, overflowY:'auto', padding:'20px'}}>
          <div style={{maxWidth: '800px', margin: '20px auto', background: 'white', borderRadius: '15px', overflow:'hidden', minHeight:'80vh', boxShadow: '0 20px 50px rgba(0,0,0,0.5)'}}>
            
            {/* 1. CAROUSEL */}
            <div style={{width: '100%', height: '400px', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               {activeCampaign.image_urls && activeCampaign.image_urls.length > 0 ? (
                 <img 
                   src={activeCampaign.image_urls[currentSlide]} 
                   style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} 
                 />
               ) : <div style={{color:'white'}}>No Images</div>}
               
               {/* Close Button Overlay */}
               <button onClick={() => setView('gallery')} style={{position: 'absolute', top: '20px', right: '20px', background: 'rgba(255,255,255,0.2)', color: 'white', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px'}}>✕</button>
               
               {/* Dots */}
               <div style={{position: 'absolute', bottom: '20px', display: 'flex', gap: '8px'}}>
                 {activeCampaign.image_urls && activeCampaign.image_urls.map((_, idx) => (
                   <div key={idx} style={{width: '8px', height: '8px', borderRadius: '50%', background: idx === currentSlide ? 'white' : 'rgba(255,255,255,0.4)', transition: 'background 0.3s'}} />
                 ))}
               </div>
            </div>

            <div style={{padding: '40px'}}>
               {/* 2. HEADER INFO */}
               <div style={{textAlign: 'center', marginBottom: '30px'}}>
                 <div style={{fontSize: '12px', fontWeight: 'bold', color: '#888', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '10px'}}>
                   {activeCampaign.brand} • {activeCampaign.year}
                 </div>
                 <h1 style={{margin: '0 0 10px 0', fontSize: '32px'}}>{activeCampaign.title}</h1>
                 {activeCampaign.slogan && <div style={{fontSize: '18px', fontStyle: 'italic', color: '#555'}}>"{activeCampaign.slogan}"</div>}
               </div>

               {/* 3. METADATA GRID */}
               <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '15px', background: '#f9f9f9', padding: '20px', borderRadius: '10px', marginBottom: '30px'}}>
                  <div><strong style={{display:'block', fontSize:'10px', color:'#999', textTransform:'uppercase'}}>Agency</strong> {activeCampaign.agency}</div>
                  <div><strong style={{display:'block', fontSize:'10px', color:'#999', textTransform:'uppercase'}}>Medium</strong> {activeCampaign.format}</div>
                  <div><strong style={{display:'block', fontSize:'10px', color:'#999', textTransform:'uppercase'}}>Sector</strong> {activeCampaign.sector}</div>
                  <div><strong style={{display:'block', fontSize:'10px', color:'#999', textTransform:'uppercase'}}>Archetype</strong> {activeCampaign.archetype}</div>
                  {activeCampaign.brand_url && (
                    <div style={{gridColumn: '1 / -1', paddingTop: '10px', borderTop: '1px solid #eee'}}>
                      <a href={activeCampaign.brand_url} target="_blank" style={{color: '#0070f3', textDecoration: 'none', fontSize: '14px'}}>🌐 Visit Official Brand Site →</a>
                    </div>
                  )}
               </div>

               {/* 4. THE INSIGHT */}
               <div style={{borderLeft: '4px solid #000', paddingLeft: '20px', marginBottom: '30px'}}>
                 <h4 style={{margin: '0 0 5px 0', textTransform: 'uppercase', fontSize: '12px', color: '#666'}}>The Insight</h4>
                 <p style={{fontSize: '20px', lineHeight: '1.4', margin: 0, fontWeight: 'bold'}}>"{activeCampaign.insight}"</p>
               </div>

               {/* 5. THE ANALYSIS */}
               <h3 style={{borderBottom: '1px solid #eee', paddingBottom: '10px', marginBottom: '20px'}}>Creative Analysis</h3>
               <div style={{fontSize: '17px', lineHeight: '1.7', color: '#333', whiteSpace: 'pre-wrap'}}>
                 {activeCampaign.analysis || activeCampaign.summary}
               </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD MODAL */}
      {view === 'add' && (
        <div style={{maxWidth: '900px', margin: '40px auto', background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 5px 30px rgba(0,0,0,0.1)'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}><h2>New Entry</h2><button onClick={() => setView('gallery')} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>✕</button></div>
          {step === 'input' && (
            <form onSubmit={handleAnalyze} style={{display:'flex', gap:'10px'}}>
              <input type="url" required placeholder="Paste Campaign URL..." value={url} onChange={e => setUrl(e.target.value)} style={{flex: 1, padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}} />
              <button style={{padding: '15px 30px', background: 'black', color: 'white', border:'none', borderRadius: '5px', cursor:'pointer'}}>Analyze</button>
            </form>
          )}
          {step === 'loading' && <p style={{textAlign:'center', padding:'40px'}}>{loadingMsg}</p>}
          {step === 'review' && analysis && (
            <div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                <input value={analysis.brand || ''} onChange={e => setAnalysis({...analysis, brand: e.target.value})} placeholder="Brand" style={inputStyle} />
                <input value={analysis.brand_url || ''} onChange={e => setAnalysis({...analysis, brand_url: e.target.value})} placeholder="Brand URL" style={inputStyle} />
                <input value={analysis.title || ''} onChange={e => setAnalysis({...analysis, title: e.target.value})} placeholder="Title" style={inputStyle} />
                <textarea value={analysis.insight || ''} onChange={e => setAnalysis({...analysis, insight: e.target.value})} placeholder="Insight" style={{...inputStyle, gridColumn:'1/-1', minHeight:'60px'}} />
                <textarea value={analysis.analysis || ''} onChange={e => setAnalysis({...analysis, analysis: e.target.value})} placeholder="Detailed Analysis" style={{...inputStyle, gridColumn:'1/-1', minHeight:'150px'}} />
                
                <input value={analysis.slogan || ''} onChange={e => setAnalysis({...analysis, slogan: e.target.value})} placeholder="Slogan" style={inputStyle} />
                <input value={analysis.archetype || ''} onChange={e => setAnalysis({...analysis, archetype: e.target.value})} placeholder="Archetype" style={inputStyle} />
                <input value={analysis.agency || ''} onChange={e => setAnalysis({...analysis, agency: e.target.value})} placeholder="Agency" style={inputStyle} />
                <input value={analysis.year || ''} onChange={e => setAnalysis({...analysis, year: e.target.value})} placeholder="Year" style={inputStyle} />
                <input value={analysis.format || ''} onChange={e => setAnalysis({...analysis, format: e.target.value})} placeholder="Medium / Format" style={inputStyle} />
                <input value={analysis.
