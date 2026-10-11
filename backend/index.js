// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenAI } = require('@google/genai');

const app = express();
const PORT = process.env.PORT || 5000;

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : null;

app.use(cors());
app.use(express.json({ limit: '10kb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/website.html'));
});

app.get('/categories', async (req, res) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true);

    if (error) return res.status(500).json({ error: 'Unable to load categories.' });
    res.json(data);
});

app.get('/products', async (req, res) => {
    const { category } = req.query;
    let query = supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('active', true);

    if (category) {
        const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', category)
            .single();

        if (categoryError || !categoryData) {
            return res.status(404).json({ error: 'Category not found' });
        }
        query = query.eq('category_id', categoryData.id);
    }

    const { data: products, error } = await query;
    if (error) return res.status(500).json({ error: 'Unable to load products.' });

    const productIds = products.map(p => p.id);
    if (!productIds.length) return res.json([]);

    const { data: offers } = await supabase
        .from('affiliate_offers')
        .select('*')
        .in('product_id', productIds);

    res.json(products.map(p => ({
        ...p,
        affiliate_offers: (offers || []).filter(o => o.product_id === p.id)
    })));
});

app.get('/products/:id', async (req, res) => {
    const { id } = req.params;
    const { data: product, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('id', id)
        .eq('active', true)
        .single();

    if (error) return res.status(404).json({ error: 'Product not found' });

    const { data: offers } = await supabase
        .from('affiliate_offers')
        .select('*')
        .eq('product_id', id);

    res.json({ ...product, affiliate_offers: offers || [] });
});

// Basic per-process rate limit: 12 AI requests per IP per 15 minutes.
const aiRequestCounts = new Map();
const AI_WINDOW_MS = 15 * 60 * 1000;
const AI_MAX_REQUESTS = 12;

app.post('/ai/recommend', async (req, res) => {
    if (!ai) {
        return res.status(503).json({ error: 'AI is not configured yet. Check the GEMINI_API_KEY environment variable on the server.' });
    }

    const queryText = typeof req.body?.query === 'string' ? req.body.query.trim() : '';
    if (!queryText || queryText.length > 500) {
        return res.status(400).json({ error: 'Enter a request between 1 and 500 characters.' });
    }

    const now = Date.now();
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const record = aiRequestCounts.get(ip);
    if (!record || now - record.startedAt >= AI_WINDOW_MS) {
        aiRequestCounts.set(ip, { startedAt: now, count: 1 });
    } else if (record.count >= AI_MAX_REQUESTS) {
        return res.status(429).json({ error: 'Too many AI searches. Please try again in 15 minutes.' });
    } else {
        record.count += 1;
    }

    try {
        const { data: products, error } = await supabase
            .from('products')
            .select('id, name, description, sport, brand, price, original_price, currency, rating, review_count, categories(name, slug)')
            .eq('active', true)
            .limit(100);

        if (error) throw new Error('Could not retrieve the product catalogue.');
        if (!products || products.length === 0) {
            return res.json({ message: 'Our catalogue is empty right now. Please check back later.', products: [] });
        }

        const catalogue = products.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description || '',
            sport: p.sport || '',
            brand: p.brand || '',
            category: p.categories?.name || '',
            price: p.price,
            currency: p.currency || 'INR',
            rating: p.rating,
            review_count: p.review_count
        }));

        const prompt = [
            'You are Apex Sports shopping assistant.',
            'Recommend only products from the provided catalogue. Do not invent product details, prices, stock, sizes, or performance claims.',
            'Interpret the customer request, then select up to 3 matching products by their exact numeric IDs.',
            'If no catalogue product fits, return an empty product_ids array and say so honestly.',
            'Return ONLY valid JSON with this shape: {"message":"brief helpful explanation","product_ids":[1,2]}.',
            'Keep the message concise and do not include prices in the message; the application will display database prices.',
            'Customer request: ' + queryText,
            'Catalogue JSON: ' + JSON.stringify(catalogue)
        ].join('\n\n');

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                temperature: 0.2,
                maxOutputTokens: 350
            }
        });

        let parsed;
        try {
            parsed = JSON.parse(response.text || '{}');
        } catch {
            throw new Error('The AI returned an unreadable response. Please try again.');
        }

        const requestedIds = Array.isArray(parsed.product_ids)
            ? [...new Set(parsed.product_ids.map(Number).filter(Number.isSafeInteger))].slice(0, 3)
            : [];
        const chosen = products.filter(p => requestedIds.includes(Number(p.id)));

        if (!chosen.length) {
            return res.json({
                message: typeof parsed.message === 'string' && parsed.message.trim()
                    ? parsed.message.trim().slice(0, 500)
                    : 'I could not find a suitable match in our current catalogue.',
                products: []
            });
        }

        const ids = chosen.map(p => p.id);
        const { data: offers } = await supabase
            .from('affiliate_offers')
            .select('product_id, merchant, affiliate_url, current_price, currency')
            .in('product_id', ids);

        const safeProducts = chosen.map(p => {
            const offer = (offers || []).find(o => o.product_id === p.id && o.affiliate_url);
            return {
                id: p.id,
                name: p.name,
                description: p.description,
                sport: p.sport,
                brand: p.brand,
                price: p.price,
                original_price: p.original_price,
                currency: p.currency || 'INR',
                image_url: p.image_url,
                rating: p.rating,
                review_count: p.review_count,
                category: p.categories?.name || '',
                merchant: offer?.merchant || 'Retailer',
                affiliate_url: offer?.affiliate_url || ''
            };
        });

        res.json({
            message: typeof parsed.message === 'string' && parsed.message.trim()
                ? parsed.message.trim().slice(0, 500)
                : 'Here are the closest matches in our catalogue.',
            products: safeProducts
        });
    } catch (error) {
        console.error('AI recommendation error:', error.message);
        res.status(502).json({ error: 'The AI search could not complete right now. Please try again shortly.' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
