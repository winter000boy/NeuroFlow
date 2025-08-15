import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import routes from './routes';

const app = express();
const connectDB = require('./config/db');

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 60_000, max: 100 }));

connectDB();


app.use('/api', routes);
app.get('/health', (_, res) => res.json({ ok: true }));

export default app;