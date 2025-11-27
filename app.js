require('dotenv').config();           // loads MONGODB_URI from your .env
console.log('MONGODB_URI =', process.env.MONGODB_URI);

const express = require('express');
const mongoose = require('mongoose');
const errorHandler = require('./src/middleware/errorHandler');
const app = express();

app.use(express.json());              // enables parsing JSON bodies
app.use(errorHandler);
const studentRoutes = require('./src/routes/studentRoutes');
app.use('/students', studentRoutes);

const authRoutes = require('./src/routes/authRoutes');
app.use('/auth', authRoutes);

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Connected to MongoDB Atlas!'))
.catch((err) => console.error('Connection error:', err));


const port=3000;
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});

