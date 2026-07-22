require('dotenv').config();
const express = require('express');
const expressLayouts = require('express-ejs-layouts');
const cookieSession = require('cookie-session');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');
const supabase = require('./db/index');

// Set up multer for file uploads in memory
const upload = multer({ storage: multer.memoryStorage() });

const app = express();
const PORT = process.env.PORT || 3000;

// Trust Vercel's reverse proxy for cookies
app.set('trust proxy', 1);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

app.use(cookieSession({
    name: 'session',
    keys: [process.env.SESSION_SECRET || 'secret'],
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
}));

// View engine
app.use(expressLayouts);
app.set('view engine', 'ejs');
app.set('layout', 'layout');

// Custom middleware to pass user to views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
    next();
});

// Admin Auth Middleware
const isAdmin = (req, res, next) => {
    if (req.session.user && req.session.user.role === 'admin') {
        return next();
    }
    res.redirect('/admin/login');
};

const sharp = require('sharp');

// Helper function to upload file to Supabase Storage
async function uploadToSupabase(file) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const fileName = uniqueSuffix + '.jpg'; // Convert everything to jpg
    
    try {
        // Process image: 800x800 square, contain original image, white background
        const processedBuffer = await sharp(file.buffer)
            .resize(800, 800, {
                fit: 'contain',
                background: { r: 255, g: 255, b: 255, alpha: 1 }
            })
            .jpeg({ quality: 90 })
            .toBuffer();

        const { data, error } = await supabase
            .storage
            .from('product-images')
            .upload(fileName, processedBuffer, {
                contentType: 'image/jpeg',
                upsert: false
            });
            
        if (error) {
            console.error('Supabase upload error:', error);
            return null;
        }
        
        const { data: publicUrlData } = supabase
            .storage
            .from('product-images')
            .getPublicUrl(fileName);
            
        return publicUrlData.publicUrl;
    } catch (err) {
        console.error('Image processing/upload error:', err);
        return null;
    }
}

// --- PUBLIC ROUTES ---
app.get('/', async (req, res) => {
    try {
        const { data: categories } = await supabase.from('categories').select('*');
        const { data: products } = await supabase
            .from('products')
            .select('*, categories(name)')
            .limit(8);
        
        const formattedProducts = (products || []).map(p => {
            let urls = [];
            if (p.image_urls) { try { urls = JSON.parse(p.image_urls); } catch(e) {} }
            p.cover_image = urls.length > 0 ? urls[0] : (p.image_url || 'https://via.placeholder.com/600x400');
            p.category_name = p.categories ? p.categories.name : null;
            return p;
        });

        res.render('index', { categories: categories || [], products: formattedProducts, title: 'Home' });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/category/:slug', async (req, res) => {
    try {
        const { data: category } = await supabase
            .from('categories')
            .select('*')
            .eq('slug', req.params.slug)
            .single();
            
        if (!category) return res.status(404).send('Category not found');
        
        const { data: products } = await supabase
            .from('products')
            .select('*')
            .eq('category_id', category.id);
        
        const formattedProducts = (products || []).map(p => {
            let urls = [];
            if (p.image_urls) { try { urls = JSON.parse(p.image_urls); } catch(e) {} }
            p.cover_image = urls.length > 0 ? urls[0] : (p.image_url || 'https://via.placeholder.com/600x400');
            return p;
        });

        res.render('category', { category, products: formattedProducts, title: category.name });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

app.get('/product/:slug', async (req, res) => {
    try {
        const { data: product } = await supabase
            .from('products')
            .select('*, categories(name, slug)')
            .eq('slug', req.params.slug)
            .single();
            
        if (!product) return res.status(404).send('Product not found');
        
        product.category_name = product.categories ? product.categories.name : null;
        product.category_slug = product.categories ? product.categories.slug : null;
        
        res.render('product', { product, title: product.title });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server Error');
    }
});

// --- ADMIN ROUTES ---
app.get('/admin/login', (req, res) => {
    if (req.session.user) return res.redirect('/admin');
    res.render('admin/login', { layout: false, error: null });
});

app.post('/admin/login', (req, res) => {
    const { username, password } = req.body;
    if (username === process.env.ADMIN_USERNAME && bcrypt.compareSync(password, process.env.ADMIN_PASSWORD_HASH)) {
        req.session.user = { username, role: 'admin' };
        res.redirect('/admin');
    } else {
        res.render('admin/login', { layout: false, error: 'Invalid credentials' });
    }
});

app.get('/admin/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

app.get('/admin', isAdmin, async (req, res) => {
    const { data: categories } = await supabase.from('categories').select('*');
    const { data: products } = await supabase
        .from('products')
        .select('*, categories(name)');
    
    const formattedProducts = (products || []).map(p => {
        let urls = [];
        if (p.image_urls) { try { urls = JSON.parse(p.image_urls); } catch(e) {} }
        p.cover_image = urls.length > 0 ? urls[0] : (p.image_url || 'https://via.placeholder.com/600x400');
        p.category_name = p.categories ? p.categories.name : null;
        return p;
    });

    res.render('admin/dashboard', { categories: categories || [], products: formattedProducts, title: 'Admin Dashboard' });
});

// Category CRUD
app.get('/admin/categories/new', isAdmin, (req, res) => {
    res.render('admin/form-category', { category: {}, title: 'New Category' });
});

app.post('/admin/categories', isAdmin, async (req, res) => {
    const { name, slug, icon } = req.body;
    const { error } = await supabase.from('categories').insert([{ name, slug, icon }]);
    if (error) {
        console.error("SUPABASE ERROR CREATING CATEGORY:", error);
    }
    res.redirect('/admin');
});

app.get('/admin/categories/:id/edit', isAdmin, async (req, res) => {
    const { data: category } = await supabase.from('categories').select('*').eq('id', req.params.id).single();
    res.render('admin/form-category', { category, title: 'Edit Category' });
});

app.post('/admin/categories/:id', isAdmin, async (req, res) => {
    const { name, slug, icon } = req.body;
    await supabase.from('categories').update({ name, slug, icon }).eq('id', req.params.id);
    res.redirect('/admin');
});

app.post('/admin/categories/:id/delete', isAdmin, async (req, res) => {
    await supabase.from('categories').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

// Product CRUD
app.get('/admin/products/new', isAdmin, async (req, res) => {
    const { data: categories } = await supabase.from('categories').select('*');
    res.render('admin/form-product', { product: {}, categories: categories || [], title: 'New Product' });
});

app.post('/admin/products', isAdmin, upload.array('images'), async (req, res) => {
    const { title, slug, description, price, image_url, affiliate_link, badge, category_id } = req.body;
    let image_urls = [];
    
    if (req.files && req.files.length > 0) {
        for (const file of req.files) {
            const url = await uploadToSupabase(file);
            if (url) image_urls.push(url);
        }
    }
    
    await supabase.from('products').insert([{
        title, slug, description, price, 
        image_url: image_url || null, 
        image_urls: JSON.stringify(image_urls), 
        affiliate_link, 
        badge: badge || null, 
        category_id: category_id || null
    }]);
    res.redirect('/admin');
});

app.get('/admin/products/:id/edit', isAdmin, async (req, res) => {
    const { data: product } = await supabase.from('products').select('*').eq('id', req.params.id).single();
    if (product && product.image_urls) {
        product.image_urls_array = JSON.parse(product.image_urls || '[]');
    } else if (product) {
        product.image_urls_array = [];
    }
    const { data: categories } = await supabase.from('categories').select('*');
    res.render('admin/form-product', { product, categories: categories || [], title: 'Edit Product' });
});

app.post('/admin/products/:id', isAdmin, upload.array('images'), async (req, res) => {
    const { title, slug, description, price, image_url, affiliate_link, badge, category_id } = req.body;
    
    const { data: existingProduct } = await supabase.from('products').select('image_urls').eq('id', req.params.id).single();
    let image_urls = (existingProduct && existingProduct.image_urls) ? JSON.parse(existingProduct.image_urls) : [];
    
    if (req.files && req.files.length > 0) {
        let new_image_urls = [];
        for (const file of req.files) {
            const url = await uploadToSupabase(file);
            if (url) new_image_urls.push(url);
        }
        image_urls = new_image_urls; // Replace with new
    }

    await supabase.from('products').update({
        title, slug, description, price, 
        image_url: image_url || null, 
        image_urls: JSON.stringify(image_urls), 
        affiliate_link, 
        badge: badge || null, 
        category_id: category_id || null
    }).eq('id', req.params.id);
    
    res.redirect('/admin');
});

app.post('/admin/products/:id/delete', isAdmin, async (req, res) => {
    await supabase.from('products').delete().eq('id', req.params.id);
    res.redirect('/admin');
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
