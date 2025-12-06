import { useState } from 'react';

export default function AdVault() {
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('input'); // input -> loading -> review -> success
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  
  async function handleAnalyze(e) {
    e.preventDefault();
    setStep('loading');
    
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ url })
    });
    
    const json = await res.json();
    if (json.error) {
      alert(json.error);
      setStep('input');
    } else {
      setAnalysis(json.strategy);
      // Pre-select the first image found
      if (json.images.length > 0) setSelectedImages([json.images[0]]);
      // Store all images temporarily
      window.tempImages = json.images; 
      setStep('review');
    }
  }

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
      setStep('success');
      setUrl('');
    } else {
      alert("Failed to save. Check password.");
    }
  }

  function toggleImage(img) {
    if (selectedImages.includes(img)) {
      setSelectedImages(selectedImages.filter(i => i !== img));
    } else {
      setSelectedImages([...selectedImages, img]);
    }
  }

  return (
    <div style={{maxWidth: '800px', margin: '50px auto', fontFamily: 'sans-serif', padding: '20px'}}>
      <h1>AdVault 🧠</h1>

      {/* STEP 1: INPUT */}
      {step === 'input' && (
        <form onSubmit={handleAnalyze} style={{display:'flex', gap:'10px'}}>
          <input 
            type="url" required placeholder="Paste Campaign URL..." 
            value={url} onChange={e => setUrl(e.target.value)}
            style={{flex: 1, padding: '15px', fontSize: '16px'}}
          />
          <button style={{padding: '15px 30px', background: 'black', color: 'white', border:'none', cursor:'pointer'}}>
            Analyze
          </button>
        </form>
      )}

      {/* STEP 2: LOADING */}
      {step === 'loading' && <p>🕵️‍♂️ Investigating... (Searching the web for credits & strategy)</p>}

      {/* STEP 3: REVIEW */}
      {step === 'review' && analysis && (
        <div>
          <div style={{background: '#f4f4f4', padding: '20px', borderRadius: '8px', marginBottom: '20px'}}>
            <h3>Strategy Review</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
              <input value={analysis.brand} onChange={e => setAnalysis({...analysis, brand: e.target.value})} placeholder="Brand" style={{padding: '8px'}} />
              <input value={analysis.agency} onChange={e => setAnalysis({...analysis, agency: e.target.value})} placeholder="Agency" style={{padding: '8px'}} />
              <input value={analysis.insight} onChange={e => setAnalysis({...analysis, insight: e.target.value})} placeholder="Insight" style={{gridColumn: '1 / -1', padding: '8px'}} />
              <input value={analysis.archetype} onChange={e => setAnalysis({...analysis, archetype: e.target.value})} placeholder="Archetype" style={{padding: '8px'}} />
            </div>
          </div>

          <h3>Select Assets to Keep</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px', marginBottom: '20px'}}>
            {window.tempImages && window.tempImages.map((img, i) => (
              <img 
                key={i} src={img} 
                onClick={() => toggleImage(img)}
                style={{
                  width: '100%', height: '100px', objectFit: 'cover', cursor: 'pointer',
                  border: selectedImages.includes(img) ? '3px solid blue' : '1px solid #ddd'
                }} 
              />
            ))}
          </div>

          <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
            <input 
              type="password" placeholder="Admin Password" 
              value={password} onChange={e => setPassword(e.target.value)}
              style={{padding: '10px', border: '1px solid #ccc'}}
            />
            <button onClick={handleSave} style={{padding: '10px 20px', background: 'green', color: 'white', border: 'none', cursor: 'pointer'}}>
              Save to Vault
            </button>
            <button onClick={() => setStep('input')} style={{padding: '10px', background: '#ccc', border: 'none', cursor: 'pointer'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'success' && (
        <div style={{textAlign: 'center', color: 'green'}}>
          <h2>Saved to Vault!</h2>
          <button onClick={() => setStep('input')} style={{marginTop: '20px', padding: '10px', cursor: 'pointer'}}>Add Another</button>
        </div>
      )}
    </div>
  );
}
