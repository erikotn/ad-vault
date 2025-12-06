import { useState, useEffect } from 'react';

export default function AdVault() {
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [campaigns, setCampaigns] = useState([]);
  const [view, setView] = useState('gallery');
  
  // Filtering
  const [activeTag, setActiveTag] = useState(''); 
  
  // Analysis & Form State
  const [url, setUrl] = useState('');
  const [userTags, setUserTags] = useState(''); 
  const [step, setStep] = useState('input'); 
  const [analysis, setAnalysis] = useState(null);
  const [selectedImages, setSelectedImages] = useState([]);
  const [loadingMsg, setLoadingMsg] = useState('');

  // Editing State
  const [editingId, setEditingId] = useState(null);
  const [editTags, setEditTags] = useState('');

  // 1. INITIALIZATION & LOGIN
  useEffect(() => {
    const savedPass = localStorage.getItem('ADVAULT_PASS');
    if (savedPass) {
      setPassword(savedPass);
      handleLogin(null, savedPass);
    }
  }, []);

  async function handleLogin(e, passOverride) {
    if (e) e.preventDefault();
    const passToUse = passOverride || password;
    
    try {
      const res = await fetch('/api/fetch', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ password: passToUse })
      });
      const json = await res.json();
      if (json.error) {
        if (!passOverride) alert("❌ " + json.error);
      } else {
        setCampaigns(json.data);
        setIsLoggedIn(true);
        localStorage.setItem('ADVAULT_PASS', passToUse);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // 2. ANALYZE
  async function handleAnalyze(e) {
    e.preventDefault();
    setStep('loading');
    setLoadingMsg("🕵️‍♂️ Investigating...");
    
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
    const processedTags = processTags(userTags);

    const finalData = {
      ...analysis,
      tags: processedTags, 
      source_url: url,
      image_urls: selectedImages
    };

    const res = await fetch('/api/save', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ data: finalData, password })
    });

    if (res.ok) {
      handleLogin(null, password);
      setView('gallery');
      setStep('input');
      setUrl('');
      setUserTags('');
      setAnalysis(null);
    } else {
      alert("Save failed.");
    }
  }

  // 4. DELETE
  async function handleDelete(id) {
    if (!confirm("Are you sure you want to delete this campaign?")) return;
    
    const res = await fetch('/api/delete', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id, password })
    });
    
    if (res.ok) {
      handleLogin(null, password); 
    } else {
      alert("Delete failed.");
    }
  }

  // 5. UPDATE (EDIT TAGS)
  function startEditing(camp) {
    setEditingId(camp.id);
    setEditTags(camp.tags || '');
  }

  async function saveEdit(id) {
    const processedTags = processTags(editTags);
    
    const res = await fetch('/api/update', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ id, tags: processedTags, password })
    });

    if (res.ok) {
      setEditingId(null);
      handleLogin(null, password); // Refresh
    } else {
      alert("Update failed.");
    }
  }

  // Helper
  function processTags(str) {
    return str.split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0)
      .slice(0, 3)
      .join(', ');
  }

  function toggleImage(img) {
    if (selectedImages.includes(img)) setSelectedImages(selectedImages.filter(i => i !== img));
    else setSelectedImages([...selectedImages, img]);
  }

  // 6. FILTER LOGIC (STRICT USER TAGS ONLY)
  const allManualTags = campaigns.flatMap(c => c.tags ? c.tags.split(',') : []).map(t => t.trim());
  const uniqueFilters = [...new Set(allManualTags)].sort();

  const filteredCampaigns = campaigns.filter(c => {
    if (!activeTag) return true;
    return c.tags && c.tags.includes(activeTag);
  });

  // --- RENDER ---
  if (!isLoggedIn) {
    return (
      <div style={{height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', color: 'white', fontFamily:'sans-serif'}}>
        <form onSubmit={e => handleLogin(e, null)} style={{display:'flex', flexDirection:'column', gap:'15px', width:'300px'}}>
          <h1 style={{textAlign:'center'}}>AdVault 🔒</h1>
          <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter Admin Password" style={{padding:'15px', borderRadius:'5px', border:'none'}} />
          <button style={{padding:'15px', background:'white', color:'black', border:'none', borderRadius:'5px', fontWeight:'bold', cursor:'pointer'}}>Unlock</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{fontFamily: 'sans-serif', background: '#f5f5f5', minHeight: '100vh', paddingBottom:'50px'}}>
      
      {/* HEADER */}
      <div style={{background: 'white', padding: '20px', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 100}}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'15px'}}>
