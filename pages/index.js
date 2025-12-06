import { useState } from 'react';

export default function AdVault() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [view, setView] = useState('gallery');
  
  // Analysis & Form State
  const [url, setUrl] = useState('');
  const [step, setStep] = useState('input'); 
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 1. LOGIN & FETCH
  async function handleLogin(e) {
    e.preventDefault();
    setLoadingMsg('Unlocking Vault...');
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password })
      });
      const json = await res.json();
      if (json.error) {
        alert("❌ " + json.error);
      } else {
        setCampaigns(json.data);
        setIsLoggedIn(true);
      }
    } catch (err) {
      alert("Connection failed");
    }
  }

  // 2. ANALYZE
  async function handleAnalyze(e) {
    e.preventDefault();
    setStep('loading');
    setLoadingMsg("🕵️‍♂️ Investigating (Searching web for credits, strategy & assets)...");
    
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ url, password })
    });
    
    const json = await res.json();
    if (json.error) {
      alert(json.error);
      setStep('input');
    } else {
      setAnalysis(json.strategy);
      if (json.images && json.images.length > 0) setSelectedImages([json.images[0]]);
      window.tempImages = json.images; 
      setStep('review');
    }
  }

  // 3. SAVE
  async function handleSave() {
    const finalData = {
      ...analysis,
      source_url: url,
      image_urls: selectedImages
    };

    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: finalData, password })
    });

    if (res.ok) {
      const refresh = await fetch('/api/fetch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password })
      });
      const refreshJson = await refresh.json();
      setCampaigns(refreshJson.data);
      
      setView('gallery');
      setStep('input');
      setUrl('');
      setAnalysis(null);
    } else {
      alert("Save failed.");
    }
  }

  function toggleImage(img) {
    if (selectedImages.includes(img)) setSelectedImages(selectedImages.filter(i => i !== img));
    else setSelectedImages([...selectedImages, img]);
  }

  // --- RENDER ---
  if (!isLoggedIn) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white', fontFamily:'sans-serif'}}>
        <form onSubmit={handleLogin} style={{display:'flex', flexDirection:'column', gap:'15px', width:'300px'}}>
          <h1 style={{textAlign:'center'}}>AdVault 🔒</h1>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter Admin Password" style={{padding:'15px', borderRadius:'5px', border:'none'}} />
          <button style={{padding:'15px', background:'white', color:'black', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh'}}>
      {/* HEADER */}
      <div style={{background: 'white', padding: '20px', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 100, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
        <h2 style={{margin:0}}>AdVault 🧠</h2>
        {view === 'gallery' && (
          <button onClick={() => setView('add')} style={{background: 'black', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'}}>+ Add Campaign</button>
        )}
      </div>

      {/* GALLERY VIEW */}
      {view === 'gallery' && (
        <div style={{padding: '20px', columnCount: 3, columnGap: '20px'}}>
          {campaigns.map(camp => (
            <div key={camp.id} style={{background: 'white', borderRadius: '10px', marginBottom: '20px', breakInside: 'avoid', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
              {camp.image_urls && camp.image_urls[0] && (
                <img src={camp.image_urls[0]} style={{width: '100%', display: 'block'}} />
              )}
              <div style={{padding: '15px'}}>
                <div style={{fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '5px'}}>
                  {camp.brand} • {camp.year}
                </div>
                <h3 style={{margin: '0 0 5px 0', fontSize: '18px'}}>{camp.title || 'Untitled'}</h3>
                
                {camp.slogan && <div style={{fontStyle:'italic', color:'#444', marginBottom:'10px'}}>"{camp.slogan}"</div>}
                
                <p style={{fontSize: '14px', color: '#555', lineHeight:'1.4'}}>{camp.insight}</p>
                
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop:'10px'}}>
                  {[camp.archetype, camp.sector, camp.format].map((tag, i) => tag && (
                    <span key={i} style={{background: '#eee', padding: '3px 8px', borderRadius: '4px', fontSize: '10px', textTransform:'uppercase'}}>{tag}</span>
                  ))}
                </div>
                <div style={{fontSize:'10px', color:'#999', marginTop:'10px', textAlign:'right'}}>{camp.agency}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ADD MODAL */}
      {view === 'add' && (
        <div style={{maxWidth: '900px', margin: '40px auto', background: 'white', padding: '40px', borderRadius: '15px', boxShadow: '0 5px 30px rgba(0,0,0,0.1)'}}>
          <div style={{display:'flex', justifyContent:'space-between', marginBottom:'20px'}}>
            <h2>New Entry</h2>
            <button onClick={() => setView('gallery')} style={{background:'none', border:'none', fontSize:'20px', cursor:'pointer'}}>✕</button>
          </div>

          {step === 'input' && (
            <form onSubmit={handleAnalyze} style={{display:'flex', gap:'10px'}}>
              <input type="url" required placeholder="Paste Campaign URL..." value={url} onChange={e => setUrl(e.target.value)} style={{flex: 1, padding: '15px', border: '1px solid #ddd', borderRadius: '5px'}} />
              <button style={{padding: '15px 30px', background: 'black', color: 'white', border:'none', borderRadius: '5px', cursor:'pointer'}}>Analyze</button>
            </form>
          )}

          {step === 'loading' && <p style={{textAlign:'center', padding:'40px'}}>{loadingMsg}</p>}

          {step === 'review' && analysis && (
            <div>
              {/* METADATA GRID */}
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                <input value={analysis.brand || ''} onChange={e => setAnalysis({...analysis, brand: e.target.value})} placeholder="Brand" style={inputStyle} />
                <input value={analysis.brand_url || ''} onChange={e => setAnalysis({...analysis, brand_url: e.target.value})} placeholder="Brand URL" style={inputStyle} />
                
                <input value={analysis.title || ''} onChange={e => setAnalysis({...analysis, title: e.target.value})} placeholder="Campaign Title" style={{...inputStyle, gridColumn: '1/-1'}} />
                
                <textarea value={analysis.insight || ''} onChange={e => setAnalysis({...analysis, insight: e.target.value})} placeholder="Strategic Insight" style={{...inputStyle, gridColumn:'1/-1', minHeight:'60px'}} />
                
                <input value={analysis.slogan || ''} onChange={e => setAnalysis({...analysis, slogan: e.target.value})} placeholder="Slogan" style={inputStyle} />
                <input value={analysis.archetype || ''} onChange={e => setAnalysis({...analysis, archetype: e.target.value})} placeholder="Archetype" style={inputStyle} />
                
                <input value={analysis.agency || ''} onChange={e => setAnalysis({...analysis, agency: e.target.value})} placeholder="Agency" style={inputStyle} />
                <input value={analysis.year || ''} onChange={e => setAnalysis({...analysis, year: e.target.value})} placeholder="Year" style={inputStyle} />
                
                <input value={analysis.sector || ''} onChange={e => setAnalysis({...analysis, sector: e.target.value})} placeholder="Sector (e.g. Auto)" style={inputStyle} />
                <input value={analysis.format || ''} onChange={e => setAnalysis({...analysis, format: e.target.value})} placeholder="Format (e.g. Film)" style={inputStyle} />
              </div>

              <h4>Select Assets ({selectedImages.length})</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))', gap: '10px', marginBottom: '30px'}}>
                {window.tempImages && window.tempImages.map((img, i) => (
                  <img 
                    key={i} src={img} onClick={() => toggleImage(img)}
                    style={{width: '100%', height: '120px', objectFit: 'cover', cursor: 'pointer', border: selectedImages.includes(img) ? '4px solid #0070f3' : '1px solid #eee', opacity: selectedImages.includes(img) ? 1 : 0.6, borderRadius:'4px'}} 
                  />
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
