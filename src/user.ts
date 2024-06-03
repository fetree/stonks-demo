import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { authenticateToken } from "./middleware";

const prisma = new PrismaClient();

const router = Router();

router.post('/updateUser', authenticateToken, async (req, res) => {
    console.log(req.headers)
    const { username, avatar, fullName } = req.body;
    const user = (req as any).user;

    try {
        // Check if the username is unique
        if (username) {
            const existingUser = await prisma.user.findUnique({
                where: { username },
            });

            if (existingUser && existingUser.id !== user.id) {
                return
            } res.status(400).json({ message: 'Username is already taken' });
        }

        // Update user metadata
        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                username,
                avatar,
                fullName
            },
        });
        res.status(200).json({ id: updatedUser.id, username: updatedUser.username, avatar: updatedUser.avatar, fullName: updatedUser.fullName });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
})

router.post('/follow', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const { followUserId } = req.body;

    if (!followUserId) {
        return res.status(400).json({ message: 'User ID to follow is required' });
    }

    if (followUserId === user.id) {
        return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    try {
        const followUser = await prisma.user.findUnique({ where: { id: followUserId } });

        if (!followUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already following
        const isFollowing = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: user.id,
                    followingId: followUserId,
                },
            },
        });

        if (isFollowing) {
            return res.status(400).json({ message: 'Already following this user' });
        }

        // Create follow record
        await prisma.follow.create({
            data: {
                followerId: user.id,
                followingId: followUserId,
            },
        });

        res.status(201).json({ message: 'Successfully followed the user' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/unfollow', authenticateToken, async (req, res) => {
    const user = (req as any).user;
    const { unfollowUserId } = req.body;

    if (!unfollowUserId) {
        return res.status(400).json({ message: 'User ID to unfollow is required' });
    }

    try {
        const followUser = await prisma.user.findUnique({ where: { id: unfollowUserId } });

        if (!followUser) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already following
        const isFollowing = await prisma.follow.findUnique({
            where: {
                followerId_followingId: {
                    followerId: user.id,
                    followingId: unfollowUserId,
                },
            },
        });

        if (!isFollowing) {
            return res.status(400).json({ message: 'Not following this user' });
        }

        // Delete follow record
        await prisma.follow.delete({
            where: {
                followerId_followingId: {
                    followerId: user.id,
                    followingId: unfollowUserId,
                },
            },
        });

        res.status(200).json({ message: 'Successfully unfollowed the user' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router