import { Router } from 'express';
import { expenseController } from '../controllers/expense.controller';
import { authenticate } from '../middlewares/auth.middleware';

const router = Router();

// Protect all routes with JWT authentication
router.use(authenticate);

// Dashboard trend & balance metrics
router.get('/dashboard', (req, res) => expenseController.getDashboard(req, res));

// Expense CRUD
router.post('/', (req, res) => expenseController.createExpense(req, res));
router.get('/', (req, res) => expenseController.getExpenses(req, res));
router.put('/:id', (req, res) => expenseController.updateExpense(req, res));
router.delete('/:id', (req, res) => expenseController.deleteExpense(req, res));

export default router;
