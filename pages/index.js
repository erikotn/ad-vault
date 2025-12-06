import { useState } from 'react';

export default function AdVault() {
  const [url, setUrl] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('input'); // input -> loading -> review -> success
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');
  
  async function handleAnalyze(e) {
    e.preventDefault();
    setStep('loading');
    setLoadingMsg("🕵️‍♂️ Searching the web for credits & strategy...");
    
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ url })
      });
      
      const json = await res.json();
      
      if (json.error) {
        alert("Error: " + json.error);
        setStep('input');
      } else {
        setAnalysis(json.strategy);
        // Automatically select the first image found as a default
        if (json.images && json.images.length > 0) {
          setSelectedImages([json.images[0]]);
        }
        // Store all images temporarily so we can pick others
        window.tempImages = json.images; 
        setStep('review');
      }
    } catch (err) {
      alert("Failed to connect to backend");
      setStep('input');
    }
  }

  async function handleSave() {
    // Combine the AI strategy data with the images you picked
    const finalData = {
      ...analysis,
      source_url: url,
      image_urls: selectedImages // This saves the list of links
    };

    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: finalData, password })
    });

    if (res.ok) {
      setStep('success');
      setUrl('');
      setAnalysis(null);
      setSelectedImages([]);
    } else {
      alert("Failed to save. Check your password.");
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
    <div style={{maxWidth: '900px', margin: '50px auto', fontFamily: 'sans-serif', padding: '20px'}}>
      <h1 style={{textAlign: 'center', marginBottom: '40px'}}>AdVault 🧠</h1>

      {/* STEP 1: INPUT */}
      {step === 'input' && (
        <div style={{textAlign: 'center'}}>
           <form onSubmit={handleAnalyze} style={{maxWidth: '600px', margin: '0 auto', display:'flex', gap:'10px'}}>
            <input 
              type="url" required placeholder="Paste Campaign URL (YouTube, AdAge, Behance...)" 
              value={url} onChange={e => setUrl(e.target.value)}
              style={{flex: 1, padding: '15px', fontSize: '16px', borderRadius: '8px', border: '1px solid #ccc'}}
            />
            <button style={{padding: '15px 30px', background: 'black', color: 'white', border:'none', borderRadius: '8px', cursor:'pointer', fontWeight: 'bold'}}>
              Analyze
            </button>
          </form>
          <p style={{marginTop: '20px', color: '#666'}}>The AI will search the web for the Brand, Agency, and Strategy.</p>
        </div>
      )}

      {/* STEP 2: LOADING */}
      {step === 'loading' && (
        <div style={{textAlign: 'center', padding: '50px'}}>
           <h2>{loadingMsg}</h2>
           <p>This usually takes 5-10 seconds.</p>
        </div>
      )}

      {/* STEP 3: REVIEW */}
      {step === 'review' && analysis && (
        <div>
          {/* Metadata Section */}
          <div style={{background: '#f9f9f9', padding: '25px', borderRadius: '12px', marginBottom: '30px', border: '1px solid #eee'}}>
            <h3 style={{marginTop: 0}}>Strategy Review</h3>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px'}}>
              <div>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#666'}}>BRAND</label>
                <input value={analysis.brand} onChange={e => setAnalysis({...analysis, brand: e.target.value})} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd'}} />
              </div>
              <div>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#666'}}>AGENCY</label>
                <input value={analysis.agency} onChange={e => setAnalysis({...analysis, agency: e.target.value})} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd'}} />
              </div>
              <div style={{gridColumn: '1 / -1'}}>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#666'}}>INSIGHT</label>
                <textarea value={analysis.insight} onChange={e => setAnalysis({...analysis, insight: e.target.value})} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd', minHeight: '60px'}} />
              </div>
              <div>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#666'}}>ARCHETYPE</label>
                <input value={analysis.archetype} onChange={e => setAnalysis({...analysis, archetype: e.target.value})} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd'}} />
              </div>
              <div>
                <label style={{fontSize: '12px', fontWeight: 'bold', color: '#666'}}>YEAR</label>
                <input value={analysis.year} onChange={e => setAnalysis({...analysis, year: e.target.value})} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '5px', border: '1px solid #ddd'}} />
              </div>
            </div>
          </div>

          {/* Image Picker Section */}
          <h3 style={{marginBottom: '15px'}}>Select Assets to Keep ({selectedImages.length})</h3>
          <div style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px', marginBottom: '30px'}}>
            {window.tempImages && window.tempImages.map((img, i) => (
              <div 
                key={i} 
                onClick={() => toggleImage(img)}
                style={{
                  height: '150px', cursor: 'pointer', borderRadius: '8px', overflow: 'hidden',
                  border: selectedImages.includes(img) ? '4px solid #0070f3' : '1px solid #eee',
                  opacity: selectedImages.includes(img) ? 1 : 0.7,
                  transition: 'all 0.2s'
                }}
              >
                <img src={img} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
              </div>
            ))}
          </div>

          {/* Save Bar */}
          <div style={{display: 'flex', gap: '15px', alignItems: 'center', borderTop: '1px solid #eee', paddingTop: '20px'}}>
            <input 
              type="password" placeholder="Admin Password" 
              value={password} onChange={e => setPassword(e.target.value)}
              style={{padding: '12px', border: '1px solid #ccc', borderRadius: '5px'}}
            />
            <button onClick={handleSave} style={{padding: '12px 30px', background: 'black', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontWeight: 'bold'}}>
              Save to Vault
            </button>
            <button onClick={() => setStep('input')} style={{padding: '12px', background: 'none', border: 'none', cursor: 'pointer', color: '#666'}}>Cancel</button>
          </div>
        </div>
      )}

      {/* STEP 4: SUCCESS */}
      {step === 'success' && (
        <div style={{textAlign: 'center', color: 'green', padding: '50px'}}>
          <h1 style={{fontSize: '40px'}}>✅</h1>
          <h2>Campaign Saved!</h2>
          <button onClick={() => setStep('input')} style={{marginTop: '20px', padding: '15px 30px', background: 'black', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer'}}>Add Another</button>
        </div>
      )}
    </div>
  );
}
