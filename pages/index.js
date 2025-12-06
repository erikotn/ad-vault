import { useState, useEffect } from 'react';

export default function AdVault() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  
  // View States
  const [view, setView] = useState('gallery'); // 'gallery', 'add', 'detail'
  const [activeCampaign, setActiveCampaign] = useState(null); // The campaign currently open in modal
  
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

  useEffect(() => {
    const savedPass = localStorage.getItem('ADVAULT_PASS');
    if (savedPass) { setPassword(savedPass); handleLogin(null, savedPass); }
  }, []);

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

  // OPEN DETAIL MODAL
  function openDetail(camp) {
    setActiveCampaign(camp);
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
                
                {/* Truncated Insight */}
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

      {/* DETAIL MODAL (THE CASE STUDY) */}
      {view === 'detail' && activeCampaign && (
        <div style={{position:'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.8)', zIndex:200, overflowY:'auto', padding:'40px 0'}}>
          <div style={{maxWidth: '800px', margin: '0 auto', background: 'white', borderRadius: '15px', overflow:'hidden', minHeight:'80vh'}}>
            {/* Modal Header */}
            <div style={{padding:'20px', borderBottom:'1px solid #eee', display:'flex', justifyContent:'space-between', alignItems:'center'}}>
               <div>
                 <div style={{fontSize:'12px', fontWeight:'bold', color:'#888', textTransform:'uppercase'}}>{activeCampaign.brand} • {activeCampaign.year}</div>
                 <h1 style={{margin:'5px 0 0 0'}}>{activeCampaign.title}</h1>
               </div>
               <button onClick={() => setView('gallery')} style={{fontSize:'24px', background:'none', border:'none', cursor:'pointer'}}>×</button>
            </div>

            {/* Modal Content */}
            <div style={{padding:'30px'}}>
               {/* Insight Box */}
               <div style={{background:'#f9f9f9', padding:'20px', borderRadius:'10px', marginBottom:'30px', borderLeft:'5px solid black'}}>
                 <h4 style={{margin:'0 0 10px 0', textTransform:'uppercase', fontSize:'12px', color:'#666'}}>The Insight</h4>
                 <p style={{margin:0, fontSize:'18px', fontStyle:'italic'}}>"{activeCampaign.insight}"</p>
               </div>

               {/* The Deep Analysis (WHY IT WORKS) */}
               <h3 style={{borderBottom:'1px solid #ddd', paddingBottom:'10px', marginBottom:'15px'}}>Why it Works (Creative Analysis)</h3>
               <div style={{fontSize:'16px', lineHeight:'1.6', color:'#333', whiteSpace:'pre-wrap', marginBottom:'40px'}}>
                 {activeCampaign.analysis || activeCampaign.summary || "No detailed analysis available."}
               </div>

               {/* Assets */}
               <h3 style={{borderBottom:'1px solid #ddd', paddingBottom:'10px', marginBottom:'15px'}}>Assets</h3>
               <div style={{display:'grid', gap:'20px'}}>
                 {activeCampaign.image_urls && activeCampaign.image_urls.map((img, i) => (
                   <img key={i} src={img} style={{width:'100%', borderRadius:'8px'}} />
                 ))}
               </div>

               {/* Footer Credits */}
               <div style={{marginTop:'50px', paddingTop:'20px', borderTop:'1px solid #eee', fontSize:'12px', color:'#999'}}>
                 <p>AGENCY: {activeCampaign.agency}</p>
                 <p>SECTOR: {activeCampaign.sector} | ARCHETYPE: {activeCampaign.archetype}</p>
                 {activeCampaign.source_url && <a href={activeCampaign.source_url} target="_blank" style={{color:'#0070f3'}}>View Original Source</a>}
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
                <input value={analysis.title || ''} onChange={e => setAnalysis({...analysis, title: e.target.value})} placeholder="Title" style={inputStyle} />
                <textarea value={analysis.insight || ''} onChange={e => setAnalysis({...analysis, insight: e.target.value})} placeholder="Insight" style={{...inputStyle, gridColumn:'1/-1', minHeight:'60px'}} />
                {/* NEW ANALYSIS BOX */}
                <textarea value={analysis.analysis || ''} onChange={e => setAnalysis({...analysis, analysis: e.target.value})} placeholder="Detailed Creative Analysis (Why it works...)" style={{...inputStyle, gridColumn:'1/-1', minHeight:'150px'}} />
                <input value={analysis.archetype || ''} onChange={e => setAnalysis({...analysis, archetype: e.target.value})} placeholder="Archetype" style={inputStyle} />
                <input value={analysis.agency || ''} onChange={e => setAnalysis({...analysis, agency: e.target.value})} placeholder="Agency" style={inputStyle} />
                <input value={userTags} onChange={e => setUserTags(e.target.value)} placeholder="Your Tags (Max 3)" style={{...inputStyle, gridColumn: '1/-1', border: '1px solid black'}} />
              </div>
              <h4>Select Assets</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '30px'}}>
                {window.tempImages && window.tempImages.map((img, i) => (
                  <img key={i} src={img} onClick={() => toggleImage(img)} style={{width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', border: selectedImages.includes(img) ? '4px solid #0070f3' : '1px solid #eee', opacity: selectedImages.includes(img) ? 1 : 0.6}} />
                ))}
              </div>
              <button onClick={handleSave} style={{width:'100%', padding:'15px', background:'green', color:'white', border:'none', borderRadius:'5px', cursor:'pointer', fontWeight:'bold'}}>Save to Vault</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const inputStyle = { padding:'12px', border:'1px solid #ddd', borderRadius:'6px', width:'100%' };
const pill = { padding:'8px 16px', borderRadius:'20px', border:'1px solid #ddd', background:'white', cursor:'pointer', whiteSpace:'nowrap'};
const activePill = { ...pill, background:'black', color:'white', borderColor:'black' };
