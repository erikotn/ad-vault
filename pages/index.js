import { useState, useEffect } from 'react';

export default function AdVault() {
  // --- STATE MANAGEMENT ---
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  
  // Navigation
  const [view, setView] = useState('gallery'); // 'gallery', 'add', 'detail'
  const [activeCampaign, setActiveCampaign] = useState(null); 
  const [currentSlide, setCurrentSlide] = useState(0); 
  
  // Filtering
  const [activeTag, setActiveTag] = useState(''); 
  
  // Analysis (New Entry)
  const [url, setUrl] = useState('');
  const [userTags, setUserTags] = useState(''); 
  const [step, setStep] = useState('input'); 
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editTags, setEditTags] = useState('');

  // --- 1. INITIALIZATION ---
  useEffect(() => {
    const savedPass = localStorage.getItem('ADVAULT_PASS');
    if (savedPass) { setPassword(savedPass); handleLogin(null, savedPass); }
  }, []);

  // --- 2. CAROUSEL TIMER ---
  useEffect(() => {
    let timer;
    const hasMultiple = activeCampaign?.image_urls?.length > 1;
    
    if (view === 'detail' && hasMultiple) {
      timer = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % activeCampaign.image_urls.length);
      }, 2500);
    }
    return () => clearInterval(timer);
  }, [view, activeCampaign]);

  // --- 3. CORE FUNCTIONS ---

  async function handleLogin(e, passOverride) {
    if (e) e.preventDefault();
    const passToUse = passOverride || password;
    try {
      const res = await fetch('/api/fetch', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ password: passToUse }) });
      const json = await res.json();
      if (!json.error) { 
        setCampaigns(json.data || []); // Safety check: default to empty array
        setIsLoggedIn(true); 
        localStorage.setItem('ADVAULT_PASS', passToUse); 
      }
    } catch (err) { console.error(err); }
  }

  async function handleAnalyze(e) {
    e.preventDefault(); 
    setStep('loading'); 
    setLoadingMsg("🕵️‍♂️ Creative Director is analyzing...");
    
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ url, password }) });
      const json = await res.json();
      if (json.error) { 
        alert(json.error); 
        setStep('input'); 
      } else { 
        setAnalysis(json.strategy); 
        // Default select first image
        if (json.images && json.images.length > 0) setSelectedImages([json.images[0]]); 
        window.tempImages = json.images; 
        setStep('review'); 
      }
    } catch (err) {
      alert("Analysis failed.");
      setStep('input');
    }
  }

  async function handleSave() {
    const processedTags = processTags(userTags);
    const finalData = { 
      ...analysis, 
      tags: processedTags, 
      source_url: url, 
      image_urls: selectedImages 
    };

    const res = await fetch('/api/save', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ data: finalData, password }) });
    
    if (res.ok) { 
      handleLogin(null, password); // Refresh data
      setView('gallery'); 
      setStep('input'); 
      setUrl(''); 
      setUserTags(''); 
      setAnalysis(null); 
    } else { 
      alert("Save failed."); 
    }
  }

  async function handleDelete(id) {
    if (!confirm("Delete this campaign?")) return;
    const res = await fetch('/api/delete', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, password }) });
    if (res.ok) { 
      handleLogin(null, password); 
      if(view === 'detail') setView('gallery'); 
    }
  }

  // Edit Functions
  function startEditing(camp) { setEditingId(camp.id); setEditTags(camp.tags || ''); }
  
  async function saveEdit(id) {
    const processedTags = processTags(editTags);
    const res = await fetch('/api/update', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ id, tags: processedTags, password }) });
    if (res.ok) { setEditingId(null); handleLogin(null, password); }
  }

  // Helpers
  function processTags(str) { return str.split(',').map(t => t.trim().toLowerCase()).filter(t => t.length > 0).slice(0, 3).join(', '); }
  
  function toggleImage(img) { 
    if (selectedImages.includes(img)) setSelectedImages(selectedImages.filter(i => i !== img)); 
    else setSelectedImages([...selectedImages, img]); 
  }

  function openDetail(camp) {
    setActiveCampaign(camp);
    setCurrentSlide(0);
    setView('detail');
  }

  function nextSlide() { if(activeCampaign?.image_urls) setCurrentSlide((prev) => (prev + 1) % activeCampaign.image_urls.length); }
  function prevSlide() { if(activeCampaign?.image_urls) setCurrentSlide((prev) => (prev - 1 + activeCampaign.image_urls.length) % activeCampaign.image_urls.length); }

  // Filtering
  const allManualTags = campaigns.flatMap(c => c.tags ? c.tags.split(',') : []).map(t => t.trim());
  const uniqueFilters = [...new Set(allManualTags)].sort();
  const filteredCampaigns = campaigns.filter(c => {
    if (!activeTag) return true;
    return c.tags && c.tags.includes(activeTag);
  });

  // --- RENDER ---

  if (!isLoggedIn) {
    return (
      <div style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#111', color:'white', fontFamily:'sans-serif'}}>
        <form onSubmit={e => handleLogin(e, null)} style={{display:'flex', flexDirection:'column', gap:'15px', width:'300px'}}>
          <h1 style={{textAlign:'center'}}>AdVault 🔒</h1>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" style={{padding:'15px', borderRadius:'5px', border:'none'}} />
          <button style={{padding:'15px', background:'white', color:'black', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh', paddingBottom:'50px'}}>
      
      {/* 1. HEADER */}
      <div style={{background: 'white', padding: '20px', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 100}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'15px'}}>
          <h2 style={{margin:0, cursor:'pointer'}} onClick={() => {setView('gallery'); setActiveTag('');}}>AdVault 🧠</h2>
          {view === 'gallery' && (
            <button onClick={() => setView('add')} style={{background: 'black', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'}}>+ Add</button>
          )}
        </div>
        {view === 'gallery' && (
          <div style={{display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '5px', scrollbarWidth:'none'}}>
            <button onClick={() => setActiveTag('')} style={activeTag === '' ? activePill : pill}>All</button>
            {uniqueFilters.map(f => <button key={f} onClick={() => setActiveTag(f)} style={activeTag === f ? activePill : pill}>{f}</button>)}
          </div>
        )}
      </div>

      {/* 2. GALLERY GRID */}
      {view === 'gallery' && (
        <div style={{padding: '20px', columnCount: 3, columnGap: '20px'}}>
          {filteredCampaigns.map(camp => (
            <div key={camp.id} style={{background: 'white', borderRadius: '10px', marginBottom: '20px', breakInside: 'avoid', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', position:'relative'}}>
              {/* Cover Image */}
              {camp.image_urls && camp.image_urls[0] && (
                <img src={camp.image_urls[0]} style={{width: '100%', display: 'block'}} />
              )}
              
              <div style={{padding: '15px'}}>
                {/* Meta Header */}
                <div style={{display:'flex', justifyContent:'space-between'}}>
                  <div style={{fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '5px'}}>{camp.brand}</div>
                  <div style={{display: 'flex', gap: '10px'}}>
                    <button onClick={() => startEditing(camp)} style={{background:'none', border:'none', cursor:'pointer', fontSize:'16px', color:'#ccc'}}>✎</button>
                    <button onClick={() => handleDelete(camp.id)} style={{background:'none', border:'none', cursor:'pointer', color:'#ccc', fontSize:'18px'}}>×</button>
                  </div>
                </div>
                
                <h3 style={{margin: '0 0 5px 0', fontSize: '18px'}}>{camp.title || 'Untitled'}</h3>
                
                {/* Truncated Insight */}
                <p style={{fontSize: '13px', color: '#444', lineHeight:'1.4', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'}}>{camp.insight}</p>
                
                <button onClick={() => openDetail(camp)} style={{background:'none', border:'none', color:'#0070f3', padding:0, fontSize:'13px', cursor:'pointer', marginBottom:'10px'}}>Read Case Study →</button>

                {/* Tags */}
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

      {/* 3. DETAIL MODAL (THE FIX) */}
      {view === 'detail' && activeCampaign && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.9)', zIndex:9999, overflowY:'auto'}}>
          <div style={{maxWidth: '900px', margin: '0 auto', minHeight: '100vh', background: 'white', position: 'relative'}}>
            
            {/* CLOSE BUTTON (Fixed Top Right) */}
            <button 
              onClick={() => setView('gallery')} 
              style={{position: 'absolute', top: '20px', right: '20px', zIndex: 10, background: 'white', color: 'black', border: 'none', borderRadius: '50%', width: '40px', height: '40px', cursor: 'pointer', fontSize: '20px', boxShadow:'0 2px 10px rgba(0,0,0,0.2)'}}
            >✕</button>

            {/* A. CAROUSEL SECTION */}
            <div style={{width: '100%', height: '550px', background: '#000', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
               {/* Image Display - Defensive Check */}
               {activeCampaign.image_urls && activeCampaign.image_urls.length > 0 ? (
                 <img 
                   src={activeCampaign.image_urls[currentSlide]} 
                   style={{maxWidth: '100%', maxHeight: '100%', objectFit: 'contain'}} 
                 />
               ) : (
                 <div style={{color:'white'}}>No Assets Saved</div>
               )}
               
               {/* Controls (Only if > 1 image) */}
               {activeCampaign.image_urls?.length > 1 && (
                 <>
                   <button onClick={prevSlide} style={{position:'absolute', left:'20px', background:'rgba(0,0,0,0.5)', border:'none', color:'white', fontSize:'30px', cursor:'pointer', width:'50px', height:'50px', borderRadius:'50%'}}>‹</button>
                   <button onClick={nextSlide} style={{position:'absolute', right:'20px', background:'rgba(0,0,0,0.5)', border:'none', color:'white', fontSize:'30px', cursor:'pointer', width:'50px', height:'50px', borderRadius:'50%'}}>›</button>
                   
                   {/* Dots */}
                   <div style={{position: 'absolute', bottom: '20px', display: 'flex', gap: '10px'}}>
                     {activeCampaign.image_urls.map((_, idx) => (
                       <div key={idx} style={{width: '8px', height: '8px', borderRadius: '50%', background: idx === currentSlide ? 'white' : 'rgba(255,255,255,0.3)', transition: 'background 0.3s'}} />
                     ))}
                   </div>
                 </>
               )}
            </div>

            {/* B. CONTENT SECTION */}
            <div style={{padding: '50px 40px'}}>
               
               {/* 1. HEADER (Title & Brand) */}
               <div style={{textAlign: 'center', marginBottom: '40px'}}>
                 <div style={{fontSize: '14px', fontWeight: 'bold', color: '#888', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '15px'}}>
                   {activeCampaign.brand || 'Unknown Brand'} • {activeCampaign.year || '----'}
                 </div>
                 <h1 style={{margin: '0 0 20px 0', fontSize: '48px', lineHeight:'1.1', fontWeight:'800', letterSpacing:'-1px'}}>
                   {activeCampaign.title}
                 </h1>
                 
                 {/* 2. METADATA ROW (Exact Request) */}
                 <div style={{display:'flex', justifyContent:'center', flexWrap:'wrap', gap:'25px', fontSize:'12px', letterSpacing:'1px', marginBottom:'25px', borderTop:'1px solid #eee', borderBottom:'1px solid #eee', padding:'20px 0'}}>
                    <div style={{textAlign:'center'}}><span style={{display:'block', color:'#999', fontWeight:'bold', marginBottom:'5px'}}>AGENCY</span>{activeCampaign.agency || 'N/A'}</div>
                    <div style={{textAlign:'center'}}><span style={{display:'block', color:'#999', fontWeight:'bold', marginBottom:'5px'}}>SECTOR</span>{activeCampaign.sector || 'N/A'}</div>
                    <div style={{textAlign:'center'}}><span style={{display:'block', color:'#999', fontWeight:'bold', marginBottom:'5px'}}>ARCHETYPE</span>{activeCampaign.archetype || 'N/A'}</div>
                    <div style={{textAlign:'center'}}><span style={{display:'block', color:'#999', fontWeight:'bold', marginBottom:'5px'}}>MEDIUM</span>{activeCampaign.format || 'N/A'}</div>
                 </div>

                 {/* 3. SLOGAN */}
                 {activeCampaign.slogan && (
                   <div style={{fontSize: '28px', fontStyle: 'italic', fontFamily:'serif', color: '#111', marginBottom:'15px'}}>
                     "{activeCampaign.slogan}"
                   </div>
                 )}
                 
                 {activeCampaign.brand_url && (
                    <a href={activeCampaign.brand_url} target="_blank" style={{color: '#0070f3', textDecoration: 'none', fontSize: '14px', fontWeight:'bold'}}>Visit Official Site →</a>
                 )}
               </div>

               {/* 4. THE INSIGHT */}
               <div style={{background: '#f8f8f8', padding: '30px', borderRadius: '12px', marginBottom: '50px', borderLeft:'6px solid #000'}}>
                 <h4 style={{margin: '0 0 10px 0', textTransform: 'uppercase', fontSize: '12px', color: '#888', letterSpacing:'1px'}}>The Strategic Insight</h4>
                 <p style={{fontSize: '22px', lineHeight: '1.5', margin: 0, fontWeight: '500'}}>"{activeCampaign.insight}"</p>
               </div>

               {/* 5. THE ANALYSIS */}
               <div style={{maxWidth: '700px', margin: '0 auto'}}>
                 <h3 style={{marginBottom: '20px', textTransform:'uppercase', fontSize:'14px', letterSpacing:'1px', borderBottom:'2px solid black', display:'inline-block', paddingBottom:'5px'}}>Creative Analysis</h3>
                 <div style={{fontSize: '18px', lineHeight: '1.8', color: '#333', whiteSpace: 'pre-wrap'}}>
                   {activeCampaign.analysis || activeCampaign.summary || "No analysis generated yet."}
                 </div>
               </div>

            </div>
          </div>
        </div>
      )}

      {/* 4. ADD MODAL */}
      {view === 'add' && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center'}}>
          <div style={{width: '900px', maxHeight:'90vh', overflowY:'auto', background: 'white', padding: '40px', borderRadius: '15px', position:'relative'}}>
            <button onClick={() => setView('gallery')} style={{position:'absolute', top:'20px', right:'20px', background:'none', border:'none', fontSize:'24px', cursor:'pointer'}}>✕</button>
            <h2 style={{marginTop:0}}>Add New Campaign</h2>
            
            {step === 'input' && (
              <form onSubmit={handleAnalyze} style={{display:'flex', gap:'10px', marginTop:'20px'}}>
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
                  <input value={analysis.sector || ''} onChange={e => setAnalysis({...analysis, sector: e.target.value})} placeholder="Sector" style={inputStyle} />
                  <input value={userTags} onChange={e => setUserTags(e.target.value)} placeholder="Your Tags (Max 3)" style={{...inputStyle, gridColumn: '1/-1', border: '1px solid black'}} />
                </div>
                <h4>Select Assets ({selectedImages.length})</h4>
                <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '30px'}}>
                  {window.tempImages && window.tempImages.map((img, i) => (
                    <img key={i} src={img} onClick={() => toggleImage(img)} style={{width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', border: selectedImages.includes(img) ? '4px solid #0070f3' : '1px solid #eee', opacity: selectedImages.includes(img) ? 1 : 0.6}} />
                  ))}
                </div>
                <button onClick={handleSave} style={{width:'100%', padding:'15px', background:'green', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Save to Vault</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding:'12px', border:'1px solid #ddd', borderRadius:'6px', width:'100%' };
const pill = { padding:'8px 16px', borderRadius:'20px', border:'1px solid #ddd', background:'white', cursor:'pointer', whiteSpace:'nowrap'};
const activePill = { ...pill, background:'black', color:'white', borderColor:'black' };
