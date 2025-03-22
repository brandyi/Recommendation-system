import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import corsOptions from './config/corsOptions.js';
import registerRouter from './routes/register.js';
import loginRouter from './routes/auth.js';
import verifyJWT from './middleware/verifyJWT.js';
import refreshRouter from './routes/refresh.js';
import logoutRouter from './routes/logout.js';
import credentials from './middleware/credentials.js';


const app = express();
const port = 3000;

app.use(credentials);
app.use(cors(corsOptions));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());

app.use('/register', registerRouter);
app.use('/auth', loginRouter);
app.use('/refresh', refreshRouter);
app.use('/logout', logoutRouter);
app.use(verifyJWT);


app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});