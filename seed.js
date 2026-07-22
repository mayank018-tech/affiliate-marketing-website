const db = require('./db/index');

const categories = [
    { name: 'Tech & Gadgets', slug: 'tech-gadgets', icon: 'fas fa-laptop' },
    { name: 'Gaming', slug: 'gaming', icon: 'fas fa-gamepad' },
    { name: 'Fashion', slug: 'fashion', icon: 'fas fa-tshirt' },
    { name: 'Beauty', slug: 'beauty', icon: 'fas fa-heart' },
    { name: 'Fitness', slug: 'fitness', icon: 'fas fa-dumbbell' },
    { name: 'Home Decor', slug: 'home-decor', icon: 'fas fa-home' },
    { name: 'Kitchen', slug: 'kitchen', icon: 'fas fa-utensils' },
    { name: 'Study Essentials', slug: 'study-essentials', icon: 'fas fa-book' }
];

const products = [
    { 
        title: 'Mechanical Gaming Keyboard', 
        slug: 'mechanical-gaming-keyboard', 
        description: 'RGB backlit mechanical keyboard with customizable macros', 
        price: 89.99, 
        image_url: 'https://placehold.co/300x200/e0e7ff/6366f1?text=Gaming+Keyboard',
        affiliate_link: '#',
        badge: 'New',
        category_slug: 'gaming'
    },
    { 
        title: 'Wireless Noise Cancelling Headphones', 
        slug: 'wireless-noise-cancelling-headphones', 
        description: 'Premium audio experience with 30hr battery life', 
        price: 199.99, 
        image_url: 'https://placehold.co/300x200/f3e8ff/8b5cf6?text=Wireless+Headphones',
        affiliate_link: '#',
        badge: 'Sale',
        category_slug: 'tech-gadgets'
    },
    { 
        title: 'Smart Fitness Tracker', 
        slug: 'smart-fitness-tracker', 
        description: 'Health monitoring with GPS and waterproof design', 
        price: 129.99, 
        image_url: 'https://placehold.co/300x200/fef3c7/f59e0b?text=Smart+Watch',
        affiliate_link: '#',
        badge: 'Hot',
        category_slug: 'fitness'
    },
    { 
        title: 'Adjustable Dumbbell Set', 
        slug: 'adjustable-dumbbell-set', 
        description: 'Space-saving adjustable weight system', 
        price: 159.99, 
        image_url: 'https://placehold.co/300x200/ecfdf5/10b981?text=Fitness+Gear',
        affiliate_link: '#',
        badge: null,
        category_slug: 'fitness'
    }
];

async function seed() {
    try {
        console.log('Seeding categories...');
        for (const cat of categories) {
            // Check if exists
            const existing = await db.getAsync('SELECT id FROM categories WHERE slug = ?', [cat.slug]);
            if (!existing) {
                await db.runAsync('INSERT INTO categories (name, slug, icon) VALUES (?, ?, ?)', [cat.name, cat.slug, cat.icon]);
            }
        }
        
        console.log('Seeding products...');
        for (const prod of products) {
            // Find category_id
            const cat = await db.getAsync('SELECT id FROM categories WHERE slug = ?', [prod.category_slug]);
            if (cat) {
                const existingProd = await db.getAsync('SELECT id FROM products WHERE slug = ?', [prod.slug]);
                if (!existingProd) {
                    await db.runAsync(`
                        INSERT INTO products (title, slug, description, price, image_url, affiliate_link, badge, category_id) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    `, [prod.title, prod.slug, prod.description, prod.price, prod.image_url, prod.affiliate_link, prod.badge, cat.id]);
                }
            }
        }
        
        console.log('Seed completed successfully.');
    } catch (err) {
        console.error('Seed error:', err);
    }
}

// Need a small timeout to let schema init finish since db/index.js does db.exec synchronously but with async callback
setTimeout(seed, 1000);
