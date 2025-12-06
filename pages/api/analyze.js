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
    // 1. THE EYES: Smart Scrape
    const response = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' 
      }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let images = [];
    
    // Get High-Res Meta Images first (Best quality)
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    if (twitterImage) images.push(twitterImage);

    // Get all page images and fix relative links
    $('img').each((i, el) => {
      let src = $(el).attr('src');
      if (src) {
        try {
          // Turn "/assets/img.jpg" into "https://site.com/assets/img.jpg"
          const absoluteUrl = new URL(src, url).href;
          // Filter out tiny icons or tracking pixels based on keywords
          if (!absoluteUrl.includes('icon') && !absoluteUrl.match(/\.(svg|gif)$/i)) {
            images.push(absoluteUrl);
          }
        } catch (e) {
          // invalid url, skip
        }
      }
    });

    // Deduplicate and limit
    images = [...new Set(images)].slice(0, 15);

    // 2. THE BRAIN: Full Strategic Analysis
    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar-pro", 
      messages: [
        {
          role: "system",
          content: "You are a Senior Creative Strategist. Analyze the URL provided. Search the web for details. Return ONLY a raw JSON object with these keys: title (campaign name), brand, brand_url (official site), agency, year, sector (e.g. Auto, FMCG, Tech), format (e.g. Film, Print, OOH), archetype (Jungian), slogan, insight (strategic hook), summary."
        },
        { role: "user", content: `Analyze this campaign: ${url}` }
      ]
    });

    let rawText = completion.choices[0].message.content;
    // Clean potential markdown formatting
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let aiData = {};
    try {
      aiData = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON Parse Error", rawText);
      // Fallback if AI messes up JSON
      aiData = { brand: "Error parsing AI", summary: rawText };
    }

    res.status(200).json({ success: true, images: images, strategy: aiData });

  } catch (error) {
    console.error("Analysis Failed:", error);
    res.status(500).json({ error: error.message });
  }
}
