import express from "express";
require('dotenv').config();
import authRoutes from './auth';
import userRoutes from './user';
import channelRoutes from './channel';
import { createServer } from "http";
import { Server } from "socket.io";
import { PrismaClient } from "@prisma/client";

const app = express();
const port = process.env.PORT || 3000;
const server = createServer(app);


app.use(express.json());
app.use(express.raw({ type: "application/vnd.custom-type" }));
app.use(express.text({ type: "text/html" }));

app.get('/', (req, res) => {
  res.send("hi");
});

app.use('/auth', authRoutes)
app.use('/user', userRoutes)
app.use('/channel', channelRoutes)

const io = new Server(server, {
  cors: {
    origin: "*", // Change this to your actual frontend URL in production
    methods: ["GET", "POST"]
  }
});

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('disconnect', () => {
    console.log('A user disconnected');
  });

  socket.on('error', (err) => {
    console.error('Socket encountered error: ', err.message, 'Closing socket');
    socket.disconnect();
  });
});

io.attach(server)

server.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});