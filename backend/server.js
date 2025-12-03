const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { Sequelize, DataTypes, Op } = require('sequelize'); 

const app = express();
const port = 8000;

app.use(cors());
app.use(express.json()); 

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.db',
  logging: false 
});


const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  is_admin: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

const Product = sequelize.define('Product', {
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT
  },
  price: {
    type: DataTypes.FLOAT,
    allowNull: false
  },
  image: {
    type: DataTypes.STRING
  },
  category: {
    type: DataTypes.STRING
  },
  rating_rate: {
    type: DataTypes.FLOAT
  },
  rating_count: {
    type: DataTypes.INTEGER
  }
});

sequelize.sync().then(async () => {
  console.log('Database & tables created via Sequelize!');

  const countProducts = await Product.count();
  
  if (countProducts === 0) {
    console.log("Table Products vide -> Lancement du remplissage automatique...");
    await insertProductsFromAPI();
  } else {
    console.log("Les produits sont déjà là, pas besoin de recharger.");
  }

  const countUsers = await User.count();
  if (countUsers === 0) {
    console.log("Table Users vide -> Création des utilisateurs...");
    await insertRandomUsers();
  } else {
    console.log("Les utilisateurs sont déjà là.");
  }



async function insertRandomUsers() {
  try {
    const urls = [1, 2, 3, 4, 5].map(() => axios.get('https://randomuser.me/api/'));
    const results = await Promise.all(urls);
    const usersData = results.map(r => r.data.results[0]);

    for (const u of usersData) {
      await User.create({
        username: u.login.username,
        email: u.email,
        password: u.login.password,
        is_admin: 0
      });
    }
    console.log('Inserted 5 random users via Sequelize.');
  } catch (err) {
    console.error('Error inserting users:', err.name); 
  }
}

async function insertProductsFromAPI() {
  try {
    const response = await axios.get('https://fakestoreapi.com/products');
    const products = response.data;

    for (const p of products) {
      await Product.create({
        title: p.title,
        description: p.description,
        price: p.price,
        image: p.image,
        category: p.category,
        rating_rate: p.rating.rate,
        rating_count: p.rating.count
      });
    }
    console.log(`Inserted ${products.length} products via Sequelize.`);
  } catch (err) {
    console.error('Error fetching products:', err.message);
  }
}


app.get('/generate-users', async (req, res) => {
  await insertRandomUsers();
  res.json({ success: true, message: 'Generated 5 random users' });
});

app.get('/generate-products', async (req, res) => {
  await insertProductsFromAPI();
  res.send('products generated');
});

app.get('/products/search', async (req, res) => {
  const searchTerm = req.query.q || '';
  console.log('Search Term:', searchTerm);

  try {
    const products = await Product.findAll({
      where: {
        [Op.or]: [
          { title: { [Op.like]: `%${searchTerm}%` } },
          { description: { [Op.like]: `%${searchTerm}%` } },
          { category: { [Op.like]: `%${searchTerm}%` } }
        ]
      }
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products', async (req, res) => {
  try {
    const products = await Product.findAll(); 
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/products/:id', async (req, res) => {
  try {
    const productId = req.params.id;
    const product = await Product.findByPk(productId);
    
    res.json(product || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/', (req, res) => {
  res.send('Hello Ipssi v2 with Sequelize!');
});

app.listen(port, () => {
  console.log(`App listening on port ${port}`);
});});