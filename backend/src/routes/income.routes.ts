import { Router } from 'express';
import { incomeController } from '../controllers/income.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all income routes with JWT authentication
router.use(authenticate);

router.post('/', (req, res) => incomeController.setIncome(req, res));
router.get('/', (req, res) => incomeController.getAllIncome(req, res));
router.get('/:year/:month', (req, res) => incomeController.getIncomeByMonth(req, res));

export default router;
