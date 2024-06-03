import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const io = new Server();

io.on('connection', (socket) => {
    const userId = socket.handshake.query.userId as string;
    socket.on('joinChannel', async ({ channelId }) => {
        socket.join(channelId);
        if (userId) {
            await prisma.user.update({
                where: { id: userId },
                data: {
                    active: true
                },
            });
        }
        console.log(`User joined channel: ${channelId}`);

        const messages = await prisma.message.findMany({
            where: { channelId },
            orderBy: { createdAt: 'asc' },
        });

        socket.emit('channelMessages', messages);
    });

    socket.on('postMessage', async ({ channelId, content, userId }) => {
        const message = await prisma.message.create({
            data: {
                content,
                channelId,
                userId,
            },
        });

        io.to(channelId).emit('newMessage', message);
    });

    socket.on('disconnect', async () => {
        if (userId) {
            await prisma.user.update({
                where: { id: userId },
                data: { active: false },
            });
        }
        console.log('user disconnected');
    });
});

export { io };
