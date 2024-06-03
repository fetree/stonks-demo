import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const io = new Server();

const roles = {
    SUPERADMIN: 'SUPERADMIN',
    HOST: 'HOST',
    ADMIN: 'ADMIN'
};

const checkRole = async (userId: string, channelId: string, requiredRole: string) => {
    const userRoles = await prisma.userRole.findMany({
        where: {
            userId,
            channelId,
            role: requiredRole,
        },
    });

    return userRoles.length > 0;
};

const handleCommand = async (command: string, userId: string, channelId: string, args: string[], socket: any) => {
    const [action, targetUsername] = args;
    const targetUser = await prisma.user.findUnique({ where: { username: targetUsername.slice(1) } });

    if (!targetUser) {
        socket.emit('error', `User ${targetUsername} not found.`);
        return;
    }

    switch (command) {
        case '/set admin':
            if (await checkRole(userId, channelId, roles.HOST)) {
                await prisma.userRole.create({
                    data: {
                        userId: targetUser.id,
                        channelId,
                        role: roles.ADMIN,
                    },
                });
                socket.emit('message', `User ${targetUsername} is now an ADMIN.`);
            } else {
                socket.emit('error', 'Only HOST can set admin.');
            }
            break;
        case '/unset admin':
            if (await checkRole(userId, channelId, roles.HOST)) {
                await prisma.userRole.deleteMany({
                    where: {
                        userId: targetUser.id,
                        channelId,
                        role: roles.ADMIN,
                    },
                });
                socket.emit('message', `User ${targetUsername} is no longer an ADMIN.`);
            } else {
                socket.emit('error', 'Only HOST can unset admin.');
            }
            break;
        case '/mute':
            // Implement mute logic
            socket.emit('message', `User ${targetUsername} has been muted.`);
            break;
        case '/unmute':
            // Implement unmute logic
            socket.emit('message', `User ${targetUsername} has been unmuted.`);
            break;
        case '/ban':
            // Implement ban logic
            socket.emit('message', `User ${targetUsername} has been banned.`);
            break;
        case '/unban':
            // Implement unban logic
            socket.emit('message', `User ${targetUsername} has been unbanned.`);
            break;
        case '/suspend':
            if (await checkRole(userId, channelId, roles.SUPERADMIN)) {
                // Implement suspend logic
                socket.emit('message', `Channel has been suspended.`);
            } else {
                socket.emit('error', 'Only SUPERADMIN can suspend the channel.');
            }
            break;
        case '/set title':
            if (await checkRole(userId, channelId, roles.HOST)) {
                await prisma.channel.update({
                    where: { id: channelId },
                    data: { title: targetUsername },
                });
                socket.emit('message', `Channel title has been updated to ${targetUsername}.`);
            } else {
                socket.emit('error', 'Only HOST can set channel title.');
            }
            break;
        case '/set description':
            if (await checkRole(userId, channelId, roles.HOST)) {
                await prisma.channel.update({
                    where: { id: channelId },
                    data: { description: targetUsername },
                });
                socket.emit('message', `Channel description has been updated.`);
            } else {
                socket.emit('error', 'Only HOST can set channel description.');
            }
            break;
        default:
            socket.emit('error', 'Invalid command.');
    }
};

io.on('connection', async (socket) => {
    console.log('New client connected');
    const userId = socket.handshake.query.userId as string;

    if (userId) {
        try {
            await prisma.user.update({
                where: { id: userId },
                data: { active: true },
            });
            console.log(`User ${userId} connected`);
        } catch (error: any) {
            console.error(`Error updating user active status: ${error.message}`);
            socket.disconnect(true);
            return;
        }

        socket.on('joinChannel', async ({ channelId }) => {
            console.log(`User ${userId} joining channel ${channelId}`);
            socket.join(channelId);
            //socket.channelId = channelId;
            try {
                const messages = await prisma.message.findMany({
                    where: { channelId },
                    orderBy: { createdAt: 'asc' },
                });
                socket.emit('channelMessages', messages);
            } catch (error: any) {
                console.error(`Error retrieving messages: ${error.message}`);
            }
        });

        socket.on('postMessage', async ({ channelId, content }) => {
            console.log(`User ${userId} posting message to channel ${channelId} with content: ${content}`);
            if (content.startsWith('/')) {
                const [command, ...args] = content.split(' ');
                await handleCommand(command, userId, channelId, args, socket);
            } else {
                try {
                    const message = await prisma.message.create({
                        data: {
                            content,
                            channelId,
                            userId,
                        },
                    });
                    console.log(`Message created: ${message.id}`);
                    io.to(channelId).emit('newMessage', message);
                } catch (error: any) {
                    console.error(`Error posting message: ${error.message}`);
                }
            }
        });

        socket.on('disconnect', async () => {
            console.log(`User ${userId} disconnected`);
            try {
                await prisma.user.update({
                    where: { id: userId },
                    data: { active: false },
                });
            } catch (error: any) {
                console.error(`Error updating user active status: ${error.message}`);
            }
        });
    } else {
        console.log('User ID not provided, disconnecting');
        socket.disconnect(true);
    }
});


export { io };
