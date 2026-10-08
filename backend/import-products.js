require('dotenv').config();
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function importProducts() {
    const csvPath = path.join(__dirname, 'products.csv');
    const fileContent = fs.readFileSync(csvPath, 'utf8');
    const rows = parse(fileContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true
    });

    console.log(`Found ${rows.length} rows in CSV. Starting import...`);

    for (const row of rows) {
        // Clean up whitespace and casing issues from the CSV
        row.name = row.name.trim();
        row.description = (row.description || '').trim();
        row.category_slug = (row.category_slug || '').trim().toLowerCase();

        // Skip if a product with this exact name already exists
        const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('name', row.name)
            .maybeSingle();

        if (existing) {
            console.log(`SKIPPED "${row.name}": already exists (id ${existing.id}).`);
            continue;
        }

        // Look up category id from the slug
        const { data: categoryData, error: categoryError } = await supabase
            .from('categories')
            .select('id')
            .eq('slug', row.category_slug)
            .single();

        if (categoryError || !categoryData) {
            console.log(`SKIPPED "${row.name}": category "${row.category_slug}" not found.`);
            continue;
        }

        // Insert the product
        const { data: product, error: productError } = await supabase
            .from('products')
            .insert([{
                name: row.name,
                description: row.description,
                category_id: categoryData.id,
                sport: row.category_slug.charAt(0).toUpperCase() + row.category_slug.slice(1),
                brand: row.brand,
                price: parseFloat(row.price),
                original_price: row.original_price ? parseFloat(row.original_price) : null,
                currency: 'INR',
                image_url: row.image_url,
                rating: row.rating ? parseFloat(row.rating) : null,
                review_count: row.review_count ? parseInt(row.review_count) : 0,
                badge: row.badge || null,
                featured: row.featured === 'TRUE' || row.featured === 'true',
                active: true
            }])
            .select()
            .single();

        if (productError) {
            console.log(`FAILED to insert "${row.name}":`, productError.message);
            continue;
        }

        // Insert the affiliate offer, if a link was provided
        if (row.affiliate_url) {
            const { error: offerError } = await supabase
                .from('affiliate_offers')
                .insert([{
                    product_id: product.id,
                    network: 'amazon',
                    merchant: 'Amazon.in',
                    affiliate_url: row.affiliate_url,
                    current_price: parseFloat(row.price),
                    currency: 'INR'
                }]);

            if (offerError) {
                console.log(`Product "${row.name}" inserted, but affiliate offer failed:`, offerError.message);
                continue;
            }
        }

        console.log(`OK: "${row.name}" imported (id ${product.id})`);
    }

    console.log('Import finished.');
}

importProducts();