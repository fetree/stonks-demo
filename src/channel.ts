import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticateToken } from "./middleware";

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

        res.status(201).json(channel);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;