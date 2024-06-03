import { PrismaClient } from "@prisma/client";
import { Router } from "express";
import { OAuth2Client } from "google-auth-library";
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticateToken } from "./middleware";
import { sendEmail } from "./email";

const prisma = new PrismaClient();

const router = Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Auth
router.post("/signUpEmail", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const existingUser = await prisma.user.findUnique({ where: { email } });

        if (existingUser) {
            return res.status(400).json({ message: 'User already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: passwordHash, active: true },
        });

        const token = jwt.sign({ email: user.email, id: user.id }, process.env.SECRET_KEY!, { expiresIn: '1h' });

        res.status(201).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post("/signInEmail", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        if (!user || !user.password) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const token = jwt.sign({ email: user.email, id: user.id }, process.env.SECRET_KEY!, { expiresIn: '1h' });

        res.status(200).json({ token });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/googleSignup', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({ message: 'Token is required' });
    }

    try {
        const ticket = await googleClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,
        });
        const payload = ticket.getPayload();

        if (!payload || !payload.email) {
            return res.status(400).json({ message: 'Invalid token' });
        }

        const { email } = payload;

        let user = await prisma.user.findUnique({ where: { email } });

        if (!user) {
            user = await prisma.user.create({
                data: { email, password: '' },
            });
        }

        const jwtToken = jwt.sign({ email: user.email, id: user.id }, process.env.SECRET_KEY!, { expiresIn: '1h' });

        res.status(200).json({ token: jwtToken });
    } catch (error) {
        console.log(error)
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/send2fa', authenticateToken, async (req, res) => {
    const user = (req as any).user;

    try {
        const twoFaCode = (Math.random() + 1).toString(36).substring(7).toUpperCase();
        const twoFaExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 min

        // Check if 2fa code exists for current user
        const existingTwoFa = await prisma.twoFa.findUnique({
            where: { userId: user.id },
        });

        if (existingTwoFa) {
            await prisma.twoFa.update({
                where: { userId: user.id },
                data: {
                    code: twoFaCode,
                    expiresAt: twoFaExpires,
                },
            });
        } else {
            await prisma.twoFa.create({
                data: {
                    userId: user.id,
                    code: twoFaCode,
                    expiresAt: twoFaExpires,
                },
            });
        }

        await sendEmail(user.email, 'Your 2FA Code', `Your 2FA code is: ${twoFaCode}`);

        res.status(200).json({ message: '2FA code sent to your email' });
    } catch (error) {
        console.error(error)
        res.status(500).json({ message: 'Internal server error' });
    }
});

router.post('/verify2fa', authenticateToken, async (req, res) => {
    const { code } = req.body;
    const user = (req as any).user;

    if (!code) {
        return res.status(400).json({ message: '2FA code is required' });
    }

    try {
        const twoFaRecord = await prisma.twoFa.findUnique({
            where: { userId: user.id },
        });

        if (!twoFaRecord) {
            return res.status(400).json({ message: '2FA is not enabled for this user' });
        }

        if (new Date() > twoFaRecord.expiresAt) {
            return res.status(400).json({ message: '2FA code has expired' });
        }

        if (twoFaRecord.code !== code) {
            return res.status(400).json({ message: 'Invalid 2FA code' });
        }

        // Clear the 2FA code after successful verification
        await prisma.twoFa.delete({
            where: { userId: user.id },
        });

        // Should also tell db that 2fa has been enabled, but cant edit the user table

        res.status(200).json({ message: '2FA verified successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Internal server error' });
    }
});

export default router;