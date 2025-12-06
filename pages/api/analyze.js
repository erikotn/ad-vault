import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const { url, password } = req.body;

  if (password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Wrong password! Credits protected.' });
  }

  try {
    // 1. THE EYES
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let images = [];
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);
    
    $('img').each((i, el) => {
      let src = $(el).attr('src');
      if (src) {
        try {
          const absoluteUrl = new URL(src, url).href;
          if (!absoluteUrl.includes('icon') && !absoluteUrl.match(/\.(svg|gif)$/i)) images.push(absoluteUrl);
        } catch (e) {}
      }
    });
    images = [...new Set(images)].slice(0, 15);

    // 2. THE BRAIN: Creative Director Persona
    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar-pro", 
      messages: [
        {
          role: "system",
          content: `You are a Creative Director at a top advertising agency. Analyze the URL provided.
          
          Return ONLY a raw JSON object with these keys: 
          - title (campaign name)
          - brand
          - brand_url
          - agency
          - year
          - sector (e.g. Auto, FMCG)
          - format (e.g. Film, Activation)
          - archetype (Jungian)
          - slogan
          - insight (The core strategic hook, 1 sentence, in DUTCH)
          - analysis (A deep dive into WHY it works creatively. Discuss the craft, the cultural tension, and the execution. Write 2-3 paragraphs in DUTCH).`
        },
        { role: "user", content: `Analyze this campaign: ${url}` }
      ]
    });

    let rawText = completion.choices[0].message.content;
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let aiData = {};
    try {
      aiData = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON Error", rawText);
      aiData = { brand: "Error", analysis: rawText };
    }

    res.status(200).json({ success: true, images: images, strategy: aiData });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
