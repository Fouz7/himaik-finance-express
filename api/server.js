import express from 'express';
import mainRouter from './routes/index.js';
import dotenv from 'dotenv';
import db from './config/db.js';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', mainRouter);

const startServer = async () => {
  try {
    await db.query('SELECT NOW()');
    console.log('Database connected successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to connect to the database:', error);
    process.exit(1);
  }
};

startServer();