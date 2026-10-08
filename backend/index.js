// Load environment variables from .env
require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to Supabase using the keys from .env
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);

// Allow the frontend to call this server
app.use(cors());
app.use(express.json());

// Serve the Apex Sport frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Open the website at the root URL
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/website.html'));
});

// Get all active categories
app.get('/categories', async (req, res) => {
    const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    res.json(data);
});

// Get all active products (optionally filtered by category slug)
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

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Fetch all affiliate offers for these products, then attach them manually
    const productIds = products.map(p => p.id);
    const { data: offers } = await supabase
        .from('affiliate_offers')
        .select('*')
        .in('product_id', productIds);

    const merged = products.map(p => ({
        ...p,
        affiliate_offers: (offers || []).filter(o => o.product_id === p.id)
    }));

    res.json(merged);
});
// Get a single product by id
app.get('/products/:id', async (req, res) => {
    const { id } = req.params;

    const { data: product, error } = await supabase
        .from('products')
        .select('*, categories(name, slug)')
        .eq('id', id)
        .eq('active', true)
        .single();

    if (error) {
        return res.status(404).json({ error: 'Product not found' });
    }

    const { data: offers } = await supabase
        .from('affiliate_offers')
        .select('*')
        .eq('product_id', id);

    res.json({ ...product, affiliate_offers: offers || [] });
});
// Start the server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});