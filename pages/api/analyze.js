import OpenAI from 'openai';
import * as cheerio from 'cheerio';

// Initialize the OpenRouter client
const openai = new OpenAI({
  baseURL: "https://openrouter.ai/api/v1",
  apiKey: process.env.OPENROUTER_API_KEY,
});

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') return res.status(405).send('Only POST allowed');

  const { url } = req.body;

  try {
    // 1. THE EYES: Scrape the page for images
    // We use a fake User-Agent so websites don't block us immediately
    const response = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let images = [];
    
    // Find all image tags
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      // Only keep valid links starting with http/https
      if (src && src.startsWith('http')) images.push(src);
    });

    // Also look for "Open Graph" images (usually the best quality main image)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.unshift(ogImage);
    
    // Remove duplicates and keep the top 15 results
    images = [...new Set(images)].slice(0, 15);

    // 2. THE BRAIN: Ask Perplexity to investigate
    // We use 'perplexity/sonar-pro' which is the active Online model
    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar-pro", 
      messages: [
        {
          role: "system",
          content: "You are a Senior Creative Strategist. Analyze the given URL. Search the web if metadata is missing. Return a JSON object with these exact keys: brand, agency, year, sector, format, archetype (choose one of the 12 Jungian archetypes), slogan, insight (a 1-sentence strategic deduction), summary."
        },
        { role: "user", content: `Analyze this campaign: ${url}` }
      ],
      response_format: { type: "json_object" }
    });

    const aiData = JSON.parse(completion.choices[0].message.content);

    // 3. Return the results to the frontend
    res.status(200).json({ 
      success: true, 
      images: images,
      strategy: aiData 
    });

  } catch (error) {
    console.error("Analysis Error:", error);
    res.status(500).json({ error: error.message });
  }
}
