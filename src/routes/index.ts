import { Router, Request, Response } from 'express';
import { AuthController } from '../controllers/AuthController';
import { UserController } from '../controllers/UserController';
import { SituationController } from '../controllers/SituationController';
import { ProductCategoryController } from '../controllers/ProductCategoryController';
import { ProductSituationController } from '../controllers/ProductSituationController';
import { ProductController } from '../controllers/ProductController';
import { verifyToken } from '../middlewares/authMiddleware';
import { verifyAdmin } from '../middlewares/adminMiddleware';
import { validateBody, validateId, validatePagination } from './validation';

const routes = Router();

const authController = new AuthController();
const userController = new UserController();
const situationController = new SituationController();
const productCategoryController = new ProductCategoryController();
const productSituationController = new ProductSituationController();
const productController = new ProductController();

routes.get('/', (req: Request, res: Response) => {
  res.json({ message: 'API rodando perfeitamente!' });
});
routes.get('/test-connection', (req: Request, res: Response) => {
  res.status(200).json({ message: 'Conexão com API realizada com sucesso!' });
});
routes.post('/login', authController.login);
routes.post('/recover-password', authController.recoverPassword);
routes.post('/validate-recover-password', authController.validateRecoverPassword);
routes.post('/reset-password', authController.resetPassword);

routes.use(verifyToken);

routes.get('/validate-token', authController.validateToken);

routes.post('/users', verifyAdmin, userController.create);
routes.get('/users', validatePagination, userController.getAll);
routes.get('/users/:id', validateId, userController.getById);
routes.put('/users/:id', validateId, verifyAdmin, userController.update);
routes.put('/users-password/:id', validateId, userController.updatePassword);
routes.delete('/users/:id', validateId, verifyAdmin, userController.delete);

routes.post('/situations', verifyAdmin, situationController.create);
routes.get('/situations', validatePagination, situationController.getAll);
routes.get('/situations/:id', validateId, situationController.getById);
routes.put('/situations/:id', validateId, verifyAdmin, situationController.update);
routes.delete('/situations/:id', validateId, verifyAdmin, situationController.delete);

routes.post('/product-categories', verifyAdmin, validateBody('product-categories', true), productCategoryController.create);
routes.get('/product-categories', validatePagination, productCategoryController.getAll);
routes.get('/product-categories/:id', validateId, productCategoryController.getById);
routes.put('/product-categories/:id', validateId, verifyAdmin, validateBody('product-categories', false), productCategoryController.update);
routes.delete('/product-categories/:id', validateId, verifyAdmin, productCategoryController.delete);

routes.post('/product-situations', verifyAdmin, validateBody('product-situations', true), productSituationController.create);
routes.get('/product-situations', validatePagination, productSituationController.getAll);
routes.get('/product-situations/:id', validateId, productSituationController.getById);
routes.put('/product-situations/:id', validateId, verifyAdmin, validateBody('product-situations', false), productSituationController.update);
routes.delete('/product-situations/:id', validateId, verifyAdmin, productSituationController.delete);

routes.post('/products', productController.create);
routes.get('/products', validatePagination, productController.getAll);
routes.get('/products/:id', validateId, productController.getById);
routes.put('/products/:id', validateId, productController.update);
routes.delete('/products/:id', validateId, productController.delete);

export default routes;
