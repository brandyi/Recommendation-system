import express from 'express';
import cors from 'cors';
import corsOptions from './config/corsOptions.js';
import registerRouter from './routes/register.js';

const app = express();
const port = 3000;


app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use('/register', registerRouter);

app.get('/', (req, res) => {
  res.send('Hello World!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});