import { Router } from 'express';
import { categoryController } from '../controllers/category.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all category routes with JWT authentication
router.use(authenticate);

router.get('/', (req, res) => categoryController.getCategories(req, res));
router.post('/', (req, res) => categoryController.createCategory(req, res));
router.delete('/:id', (req, res) => categoryController.deleteCategory(req, res));

export default router;
