const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cloudinary = require('cloudinary').v2;

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '4.5mb' }));

// ----- Cloudinary Config (from Environment Variables) -----
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ----- MongoDB Connection -----
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => console.log('MongoDB Connected'))
  .catch(err => console.error('MongoDB error:', err));

// ----- Mongoose Schemas (All in one file for Vercel) -----
const ProductSchema = new mongoose.Schema({
  productId: { type: Number, unique: true },
  name: String, nameAr: String,
  price: Number, oldPrice: Number,
  description: String, descriptionAr: String,
  image: String,
  badge: String,
  isWeighted: Boolean,
  pricePerKg: Number,
  recommendedWeights: [Number],
  backgroundImage: String,
});
const Product = mongoose.model('Product', ProductSchema);

const OrderSchema = new mongoose.Schema({
  orderId: { type: Number, unique: true },
  date: { type: Date, default: Date.now },
  customer: {
    firstName: String, lastName: String, phone: String,
    wilaya: String, baladiya: String,
  },
  items: [{
    productId: Number, name: String, nameAr: String,
    price: Number, quantity: Number,
    selectedWeight: Number, label: String,
  }],
  deliveryOption: String,
  deliveryFee: Number,
  totalPrice: Number,
  status: { type: String, default: 'pending' },
});
const Order = mongoose.model('Order', OrderSchema);

const LeadSchema = new mongoose.Schema({
  leadId: { type: String, unique: true },
  customer: {
    firstName: String, lastName: String, phone: String,
    wilaya: String, baladiya: String,
  },
  status: { type: String, default: 'partial' },
  lastUpdated: { type: Date, default: Date.now },
});
const Lead = mongoose.model('Lead', LeadSchema);

const AdminSchema = new mongoose.Schema({
  username: String,
  password: String,
});
const Admin = mongoose.model('Admin', AdminSchema);

// ----- Helpers -----
function generateOrderId() { return Date.now(); }
function generateLeadId() { return 'LD-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substr(2, 4).toUpperCase(); }

// ----- Auth Middleware -----
function verifyToken(req, res, next) {
  const token = req.headers['x-admin-token'];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    jwt.verify(token, process.env.JWT_SECRET || 'secret');
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// ----- API Routes -----
app.get('/api/products', async (req, res) => {
  const products = await Product.find().sort({ productId: 1 });
  res.json(products.map(p => ({
    id: p.productId, name: p.name, nameAr: p.nameAr,
    price: p.price, oldPrice: p.oldPrice,
    description: p.description, descriptionAr: p.descriptionAr,
    image: p.image, badge: p.badge,
    isWeighted: p.isWeighted, pricePerKg: p.pricePerKg,
    recommendedWeights: p.recommendedWeights, backgroundImage: p.backgroundImage
  })));
});

app.get('/api/products/:id', async (req, res) => {
  const p = await Product.findOne({ productId: parseInt(req.params.id) });
  if (!p) return res.status(404).json({ error: 'Not found' });
  res.json(p);
});

app.post('/api/products/add', verifyToken, async (req, res) => {
  try {
    const { nameAr, price, oldPrice, descriptionAr, badge, image, isWeighted, pricePerKg, recommendedWeights, backgroundImage } = req.body;
    const last = await Product.findOne().sort({ productId: -1 });
    const newId = last ? last.productId + 1 : 1;

    // Cloudinary expects URL, so we only save the URL (image is already uploaded client-side)
    const product = new Product({
      productId: newId, name: nameAr, nameAr,
      price: parseInt(price), oldPrice: oldPrice || null,
      description: descriptionAr, descriptionAr,
      image: image || '', badge: badge || '',
      isWeighted: isWeighted || false,
      pricePerKg: pricePerKg || 0,
      recommendedWeights: recommendedWeights || [],
      backgroundImage: backgroundImage || '',
    });
    await product.save();
    res.status(201).json({ success: true, product });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.put('/api/products/:id', verifyToken, async (req, res) => {
  const p = await Product.findOne({ productId: parseInt(req.params.id) });
  if (!p) return res.status(404).json({ error: 'Not found' });
  const { nameAr, price, oldPrice, descriptionAr, badge, image, isWeighted, pricePerKg, recommendedWeights, backgroundImage } = req.body;
  
  p.name = nameAr; p.nameAr = nameAr; p.price = parseInt(price); p.oldPrice = oldPrice || null;
  p.description = descriptionAr; p.descriptionAr = descriptionAr; p.badge = badge || '';
  p.isWeighted = isWeighted; p.pricePerKg = pricePerKg; p.recommendedWeights = recommendedWeights;
  if (image !== undefined) p.image = image;
  if (backgroundImage !== undefined) p.backgroundImage = backgroundImage;
  await p.save();
  res.json({ success: true, product: p });
});

app.delete('/api/products/:id', verifyToken, async (req, res) => {
  await Product.deleteOne({ productId: parseInt(req.params.id) });
  res.json({ success: true });
});

app.post('/api/orders', async (req, res) => {
  try {
    const { customer, items, deliveryOption, deliveryFee, totalPrice } = req.body;
    const orderId = generateOrderId();
    const order = new Order({ orderId, customer, items, deliveryOption, deliveryFee, totalPrice });
    await order.save();
    res.status(201).json({ success: true, orderId });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/orders', verifyToken, async (req, res) => {
  const orders = await Order.find().sort({ date: -1 });
  res.json(orders);
});

app.get('/api/orders/track/:id', async (req, res) => {
  const order = await Order.findOne({ orderId: parseInt(req.params.id) });
  if (!order) return res.json({ found: false });
  res.json({ found: true, status: order.status, date: order.date });
});

app.put('/api/orders/:id/status', verifyToken, async (req, res) => {
  const order = await Order.findOne({ orderId: parseInt(req.params.id) });
  if (!order) return res.status(404).json({ error: 'Not found' });
  order.status = req.body.status;
  await order.save();
  res.json({ success: true });
});

app.delete('/api/orders/:id', verifyToken, async (req, res) => {
  await Order.deleteOne({ orderId: parseInt(req.params.id) });
  res.json({ success: true });
});

app.post('/api/leads', async (req, res) => {
  const { firstName, lastName, phone, wilaya, baladiya } = req.body;
  let lead = await Lead.findOne({ 'customer.phone': phone });
  if (lead) {
    lead.customer = { ...lead.customer, firstName, lastName, wilaya, baladiya };
    lead.lastUpdated = new Date();
    await lead.save();
    return res.json(lead);
  }
  const leadId = generateLeadId();
  const newLead = new Lead({ leadId, customer: { firstName, lastName, phone, wilaya, baladiya } });
  await newLead.save();
  res.status(201).json(newLead);
});

app.get('/api/leads', verifyToken, async (req, res) => {
  const leads = await Lead.find({ status: { $ne: 'converted' } }).sort({ lastUpdated: -1 });
  res.json(leads);
});

app.post('/api/leads/:leadId/convert', verifyToken, async (req, res) => {
  const lead = await Lead.findOne({ leadId: req.params.leadId });
  if (!lead) return res.status(404).json({ error: 'Not found' });
  const orderId = generateOrderId();
  const order = new Order({ orderId, customer: lead.customer, items: [], totalPrice: 0, status: 'pending' });
  await order.save();
  lead.status = 'converted';
  await lead.save();
  res.json({ success: true, orderId });
});

app.delete('/api/leads/:leadId', verifyToken, async (req, res) => {
  await Lead.deleteOne({ leadId: req.params.leadId });
  res.json({ success: true });
});

app.post('/api/admin/login', async (req, res) => {
  const { username, password } = req.body;
  const admin = await Admin.findOne({ username });
  if (!admin || !await bcrypt.compare(password, admin.password))
    return res.status(401).json({ success: false, error: 'Invalid credentials' });
  const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
  res.json({ success: true, token });
});

app.post('/api/admin/logout', verifyToken, (req, res) => res.json({ success: true }));
app.get('/api/admin/storage', verifyToken, (req, res) => res.json({ usedMB: 0, freeMB: 512, percentage: 0 }));

// Init Admin
(async () => {
  if (!await Admin.countDocuments()) {
    const hashed = await bcrypt.hash('admin123', 10);
    await Admin.create({ username: 'admin', password: hashed });
    console.log('Default admin: admin / admin123');
  }
})();

module.exports = app;