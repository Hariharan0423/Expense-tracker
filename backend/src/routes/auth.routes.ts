import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Public auth routes
router.post('/signup', (req, res, next) => authController.signup(req, res, next));
router.post('/login', (req, res, next) => authController.login(req, res, next));
router.post('/refresh', (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Example protected route to verify the authenticate middleware
router.get('/me', authenticate, (req, res) => {
  res.status(200).json({
    message: 'Authenticated successfully',
    userId: req.userId,
  });
});

export default router;
