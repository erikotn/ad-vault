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
    // 1. THE EYES: Scrape the page for images (Cheerio)
    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let images = [];
    $('img').each((i, el) => {
      const src = $(el).attr('src');
      if (src && src.startsWith('http')) images.push(src);
    });
    // Add the "Open Graph" image (usually the best one) to the top
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.unshift(ogImage);
    
    // Remove duplicates and keep top 10
    images = [...new Set(images)].slice(0, 10);

    // 2. THE BRAIN: Ask Perplexity to investigate (OpenRouter)
    const completion = await openai.chat.completions.create({
      model: "perplexity/llama-3.1-sonar-large-128k-online", // This model searches the web!
      messages: [
        {
          role: "system",
          content: "You are a Senior Creative Strategist. Analyze the given URL. Search the web if metadata is missing. Return a JSON object with these exact keys: brand, agency, year, sector, format, archetype, slogan, insight (a 1-sentence strategic deduction), summary."
        },
        { role: "user", content: `Analyze this campaign: ${url}` }
      ],
      response_format: { type: "json_object" }
    });

    const aiData = JSON.parse(completion.choices[0].message.content);

    // 3. Return everything to the frontend
    res.status(200).json({ 
      success: true, 
      images: images,
      strategy: aiData 
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
}
