import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticateToken } from "./middleware";
import { sendEmail } from "./email";

const prisma = new PrismaClient();

const router = Router();

router.post('/sendWebPush', authenticateToken, async (req, res) => {
    console.log(req.headers)
    const { userId } = req.body;
    const user = (req as any).user;

    try {

    } catch (error) {

    }
});

router.post('/createChannel', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const { title, description } = req.body;

    try {
        const channel = await prisma.channel.create({
            data: {
                title,
                description,
                creatorId: user.id,
            },
        });

        // Send notification to followers, will just do email right now
        const [activeFollowers, inactiveFollowers] = await Promise.all([prisma.follow.findMany({
            where: {
                followingId: user.id,
                follower: {
                    active: true,
                },
            },
            include: {
                follower: true,
            },
        }), prisma.follow.findMany({
            where: {
                followingId: user.id,
                follower: {
                    active: false,
                },
            },
            include: {
                follower: true,
            },
        })]);

        activeFollowers.forEach(f => {
            const email = f.follower.email;
            const subject = `${user.username} just went live!`;
            const text = `Hey! ${f.follower.username},\n\nA new channel "${title}" has been started`;
            sendEmail(email, subject, text);
        });

        // Send emails to inactive followers
        inactiveFollowers.forEach(f => {
            const email = f.follower.email;
            const subject = 'Offline user get back on!';
            const text = `Hey! ${f.follower.username},\n\nWe've created a new channel titled "${title}" hop on stonks to watch!`;
            sendEmail(email, subject, text);
        });


        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;