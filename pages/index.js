import { useState, useEffect } from 'react';

export default function AdVault() {
  // Authentication State
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  
  // App State
  const [campaigns, setCampaigns] = useState([]);
  const [view, setView] = useState('gallery'); // 'gallery' or 'add'
  
  // Analysis State
  const [url, setUrl] = useState('');
  const [step, setStep] = useState('input'); 
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');

  // 1. CHECK LOGIN & FETCH DATA
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

  // 2. ANALYZE (Now Secure)
  async function handleAnalyze(e) {
    e.preventDefault();
    setStep('loading');
    setLoadingMsg("🕵️‍♂️ Investingating (this costs credits)...");
    
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ url, password }) // Sending password for verification
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

  // 3. SAVE & RETURN TO GALLERY
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
      // Refresh the gallery
      const refresh = await fetch('/api/fetch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password })
      });
      const refreshJson = await refresh.json();
      setCampaigns(refreshJson.data);
      
      // Reset and go back
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
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white'}}>
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
        <h2 style={{margin:0}}>AdVault</h2>
        {view === 'gallery' && (
          <button onClick={() => setView('add')} style={{background: 'black', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '20px', cursor: 'pointer', fontWeight: 'bold'}}>
            + Add Campaign
          </button>
        )}
      </div>

      {/* VIEW: GALLERY (Masonry Moodboard) */}
      {view === 'gallery' && (
        <div style={{padding: '20px', columnCount: 3, columnGap: '20px'}}>
          {campaigns.map(camp => (
            <div key={camp.id} style={{background: 'white', borderRadius: '10px', marginBottom: '20px', breakInside: 'avoid', overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.05)'}}>
              {/* Cover Image */}
              {camp.image_urls && camp.image_urls[0] && (
                <img src={camp.image_urls[0]} style={{width: '100%', display: 'block'}} />
              )}
              
              <div style={{padding: '15px'}}>
                <div style={{fontSize: '10px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase', marginBottom: '5px'}}>{camp.brand}</div>
                <h3 style={{margin: '0 0 5px 0', fontSize: '16px'}}>{camp.title || 'Untitled'}</h3>
                <div style={{fontSize: '14px', color: '#555', marginBottom: '10px'}}>{camp.insight}</div>
                
                {/* Tags */}
                <div style={{display: 'flex', flexWrap: 'wrap', gap: '5px'}}>
                  {camp.archetype && <span style={{background: '#eee', padding: '3px 8px', borderRadius: '4px', fontSize: '10px'}}>#{camp.archetype}</span>}
                  {camp.sector && <span style={{background: '#eee', padding: '3px 8px', borderRadius: '4px', fontSize: '10px'}}>#{camp.sector}</span>}
                </div>
              </div>
            </div>
          ))}
          {campaigns.length === 0 && <p style={{textAlign: 'center', marginTop: '50px', color: '#888'}}>Vault is empty. Add a campaign!</p>}
        </div>
      )}

      {/* VIEW: ADD MODAL */}
      {view === 'add' && (
        <div style={{maxWidth: '800px', margin: '40px auto', background: 'white', padding: '30px', borderRadius: '15px', boxShadow: '0 5px 30px rgba(0,0,0,0.1)'}}>
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
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px'}}>
                <input value={analysis.brand} onChange={e => setAnalysis({...analysis, brand: e.target.value})} placeholder="Brand" style={{padding:'10px', border:'1px solid #ddd'}} />
                <input value={analysis.agency} onChange={e => setAnalysis({...analysis, agency: e.target.value})} placeholder="Agency" style={{padding:'10px', border:'1px solid #ddd'}} />
                <textarea value={analysis.insight} onChange={e => setAnalysis({...analysis, insight: e.target.value})} placeholder="Insight" style={{gridColumn:'1/-1', padding:'10px', border:'1px solid #ddd'}} />
                <input value={analysis.archetype} onChange={e => setAnalysis({...analysis, archetype: e.target.value})} placeholder="Archetype" style={{padding:'10px', border:'1px solid #ddd'}} />
              </div>

              <h4>Select Images for Board</h4>
              <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '20px'}}>
                {window.tempImages && window.tempImages.map((img, i) => (
                  <img 
                    key={i} src={img} onClick={() => toggleImage(img)}
                    style={{width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer', border: selectedImages.includes(img) ? '3px solid blue' : '1px solid #eee', opacity: selectedImages.includes(img) ? 1 : 0.6}} 
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
