import express from "express";
require('dotenv').config();
import authRoutes from './auth';
import userRoutes from './user';
import channelRoutes from './channel';
import { createServer } from "http";
import { join } from 'node:path';
import { io } from './websocket'
const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);


app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));

app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'index.html'));
});

app.use('/auth', authRoutes)
app.use('/user', userRoutes)
app.use('/channel', channelRoutes)

io.attach(server)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});