import { connectDatabase } from '../config/database';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import * as readline from 'readline';

import { generateSlug } from '../utils/helpers';

async function seedCatalog() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    await connectDatabase();
    
    // SAFETY WARNING: Require confirmation before wiping DB
    console.warn('\n==================================================');
    console.warn('⚠️ WARNING: This will DELETE the entire catalog! ⚠️');
    console.warn('==================================================\n');
    
    await new Promise<void>((resolve, reject) => {
      rl.question('Are you sure you want to run this seed script? (yes/no): ', (answer) => {
        if (answer.toLowerCase() === 'yes') {
          resolve();
        } else {
          reject(new Error('Seed script cancelled by user.'));
        }
      });
    });
    rl.close();

    console.log('Seeding catalog...');

    // Delete existing
    await Product.deleteMany({});
    await Category.deleteMany({});
    console.log('Cleared existing catalog data.');

    // 1. Create Categories
    const categoriesData = [
      { 
        name: 'Snacks & Beverages', nameHindi: 'नमकीन और पेय', description: 'Chips, biscuits, cold drinks', sortOrder: 1,
        image: { url: 'https://images.unsplash.com/photo-1599598425947-33002620b7bf?q=80&w=200&auto=format&fit=crop', publicId: 'seed-snacks' }
      },
      { 
        name: 'Sweets & Chocolates', nameHindi: 'मिठाइयां और चॉकलेट', description: 'Chocolates, mithai', sortOrder: 2,
        image: { url: 'https://images.unsplash.com/photo-1621939514649-280e2ee25f60?q=80&w=200&auto=format&fit=crop', publicId: 'seed-sweets' }
      },
      { 
        name: 'Dairy & Bakery', nameHindi: 'डेयरी और बेकरी', description: 'Milk, bread, butter', sortOrder: 3,
        image: { url: 'https://images.unsplash.com/photo-1628088062854-d1870b4553da?q=80&w=200&auto=format&fit=crop', publicId: 'seed-dairy' }
      },
      { 
        name: 'Staples', nameHindi: 'राशन', description: 'Dal, rice, flour', sortOrder: 4,
        image: { url: 'https://images.unsplash.com/photo-1586201375761-83865001e8ac?q=80&w=200&auto=format&fit=crop', publicId: 'seed-staples' }
      },
      { 
        name: 'Personal Care', nameHindi: 'पर्सनल केयर', description: 'Soap, shampoo', sortOrder: 5,
        image: { url: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?q=80&w=200&auto=format&fit=crop', publicId: 'seed-care' }
      },
    ];

    const createdCategories = [];
    for (const cat of categoriesData) {
      const category = await Category.create({
        ...cat,
        slug: generateSlug(cat.name),
        isActive: true,
      });
      createdCategories.push(category);
      console.log(`[+] Category created: ${category.name}`);
    }

    // 2. Create Products
    const productsData = [
      {
        categoryName: 'Snacks & Beverages',
        name: 'Lays Classic Salted',
        nameHindi: 'लेज़ क्लासिक साल्टेड',
        description: 'Crispy potato chips',
        price: 20,
        mrp: 20,
        stock: 50,
        unit: 'piece',
        unitValue: 1,
        isFeatured: true,
        thumbnail: { url: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=300&auto=format&fit=crop', publicId: 'seed-lays' }
      },
      {
        categoryName: 'Snacks & Beverages',
        name: 'Coca Cola 2L',
        nameHindi: 'कोका कोला 2L',
        description: 'Refreshing cold drink',
        price: 90,
        mrp: 95,
        stock: 30,
        unit: 'bottle',
        unitValue: 1,
        isFeatured: true,
        thumbnail: { url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?q=80&w=300&auto=format&fit=crop', publicId: 'seed-coke' }
      },
      {
        categoryName: 'Sweets & Chocolates',
        name: 'Cadbury Dairy Milk',
        nameHindi: 'कैडबरी डेयरी मिल्क',
        description: 'Smooth chocolate',
        price: 40,
        mrp: 45,
        stock: 100,
        unit: 'piece',
        unitValue: 1,
        isFeatured: false,
        thumbnail: { url: 'https://images.unsplash.com/photo-1606312619070-d48b4c652a52?q=80&w=300&auto=format&fit=crop', publicId: 'seed-cadbury' }
      },
      {
        categoryName: 'Dairy & Bakery',
        name: 'Amul Taaza Milk',
        nameHindi: 'अमूल ताज़ा दूध',
        description: 'Toned milk',
        price: 33,
        mrp: 34,
        stock: 40,
        unit: 'packet',
        unitValue: 1,
        isFeatured: true,
        thumbnail: { url: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?q=80&w=300&auto=format&fit=crop', publicId: 'seed-milk' }
      },
      {
        categoryName: 'Staples',
        name: 'Fortune Basmati Rice',
        nameHindi: 'फॉर्च्यून बासमती चावल',
        description: 'Long grain rice',
        price: 150,
        mrp: 180,
        stock: 20,
        unit: 'kg',
        unitValue: 1,
        isFeatured: true,
        thumbnail: { url: 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=300&auto=format&fit=crop', publicId: 'seed-rice' }
      }
    ];

    for (const prod of productsData) {
      const category = createdCategories.find(c => c.name === prod.categoryName);
      if (category) {
        const slug = generateSlug(prod.name);
        await Product.create({
          name: prod.name,
          nameHindi: prod.nameHindi,
          description: prod.description,
          descriptionHindi: prod.description,
          category: category._id,
          sku: `SKU-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          unit: prod.unit,
          unitValue: prod.unitValue,
          price: prod.price,
          mrp: prod.mrp,
          stock: prod.stock,
          isAvailable: prod.stock > 0,
          isFeatured: prod.isFeatured,
          isActive: true,
          slug,
          thumbnail: prod.thumbnail,
          images: prod.thumbnail ? [prod.thumbnail] : [],
        });
        
        // Update category count
        await Category.findByIdAndUpdate(category._id, { $inc: { productCount: 1 } });
        console.log(`[+] Product created: ${prod.name}`);
      }
    }

    console.log('Catalog seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Catalog seeding failed:', error);
    process.exit(1);
  }
}

seedCatalog();
