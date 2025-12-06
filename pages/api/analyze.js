import OpenAI from 'openai';
import * as cheerio from 'cheerio';

const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const { url } = req.body;

  try {
    // 1. THE EYES: Scrape images
    // We use a fake User-Agent to avoid being blocked
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let images = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) images.push(src);
    });
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.unshift(ogImage);
    images = [...new Set(images)].slice(0, 15);

    // 2. THE BRAIN: Ask Perplexity (Using the NEW Model)
    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar-pro", // UPDATED MODEL NAME
      messages: [
        {
          role: "system",
          // We strictly ask for raw JSON only
          content: "You are a Senior Creative Strategist. Analyze the URL provided. Search the web for missing credits. Return ONLY a raw JSON object (no markdown formatting, no '```json' wrapper) with these keys: brand, agency, year, sector, format, archetype, slogan, insight, summary."
        },
        { role: "user", content: `Analyze this campaign: ${url}` }
      ]
      // REMOVED "response_format" to prevent 400 Error
    });

    // 3. CLEAN & PARSE (Fixes any AI formatting issues)
    let rawText = completion.choices[0].message.content;
    
    // Remove markdown code blocks if present
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const aiData = JSON.parse(rawText);

    res.status(200).json({ 
      success: true, 
      images: images,
      strategy: aiData 
    });

  } catch (error) {
    console.error("Analysis Failed:", error);
    res.status(500).json({ error: error.message });
  }
}
