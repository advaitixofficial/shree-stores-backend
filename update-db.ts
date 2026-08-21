import { connectDatabase } from './src/config/database';
import { Product } from './src/models/Product';
import mongoose from 'mongoose';

async function run() {
  await connectDatabase();
  await Product.updateOne({ name: 'Lays Classic Salted' }, { 'thumbnail.url': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=300&auto=format&fit=crop', 'images.0.url': 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?q=80&w=300&auto=format&fit=crop' });
  await Product.updateOne({ name: 'Fortune Basmati Rice' }, { 'thumbnail.url': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=300&auto=format&fit=crop', 'images.0.url': 'https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?q=80&w=300&auto=format&fit=crop' });
  console.log('Updated DB');
  process.exit(0);
}
run();
