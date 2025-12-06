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
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36' }
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let images = [];
    const ogImage = $('meta[property="og:image"]').attr('content');
    if (ogImage) images.push(ogImage);
    const twitterImage = $('meta[name="twitter:image"]').attr('content');
    if (twitterImage) images.push(twitterImage);
    
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

    // 2. THE BRAIN: The Detective
    const completion = await openai.chat.completions.create({
      model: "perplexity/sonar-pro", 
      messages: [
        {
          role: "system",
          content: `You are a Senior Creative Strategist. Analyze the URL provided. Search the web for missing details.
          
          Return ONLY a raw JSON object with these exact keys:
          - title (The official campaign name)
          - brand (The brand name)
          - brand_url (The official website of the brand, e.g. nike.com)
          - agency (The creative agency, e.g. Wieden+Kennedy)
          - year (e.g. 2024)
          - sector (e.g. Automotive, FMCG, Tech, Luxury)
          - format (The medium, e.g. Film, OOH, Social Activation, Print)
          - archetype (The Jungian archetype, e.g. The Hero, The Outlaw)
          - slogan (The tagline of the campaign)
          - insight (The core strategic hook in one sentence, written in DUTCH)
          - analysis (A creative critique of why it works, 2 paragraphs, written in DUTCH)`
        },
        { role: "user", content: `Analyze this campaign: ${url}` }
      ]
    });

    let rawText = completion.choices[0].message.content;
    // Clean potential markdown from AI
    rawText = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let aiData = {};
    try {
      aiData = JSON.parse(rawText);
    } catch (e) {
      console.error("JSON Error", rawText);
      aiData = { brand: "Error parsing AI", analysis: rawText };
    }

    res.status(200).json({ success: true, images: images, strategy: aiData });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
