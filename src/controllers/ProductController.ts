import { Request, Response } from 'express';
import * as yup from 'yup';
import { sendError } from './sendError';
import { ProductService } from '../services/ProductService';
import { ProductCategoryService } from '../services/ProductCategoryService';
import { ProductSituationService } from '../services/ProductSituationService';

const productService = new ProductService();
const productCategoryService = new ProductCategoryService();
const productSituationService = new ProductSituationService();

export class ProductController {
  async create(req: Request, res: Response): Promise<void> {
    try {
      const schema = yup.object().shape({
        name: yup
          .string()
          .trim()
          .required('O campo nome é obrigatório!')
          .min(3, 'O campo nome deve ter no mínimo 3 caracteres!'),
        description: yup
          .string()
          .trim()
          .required('O campo descrição é obrigatório!'),
        price: yup
          .number()
          .typeError('Informe um preço válido!')
          .min(0, 'Informe um preço válido e não negativo!')
          .required('O campo preço é obrigatório!'),
        productCategoryId: yup
          .number()
          .typeError('ID da categoria inválido!')
          .integer('ID da categoria inválido!')
          .positive('ID da categoria inválido!')
          .required('O campo categoria é obrigatório!'),
        productSituationId: yup
          .number()
          .typeError('ID da situação inválido!')
          .integer('ID da situação inválido!')
          .positive('ID da situação inválido!')
          .required('O campo situação é obrigatório!'),
      });

      const data = await schema.validate(req.body, { abortEarly: false });

      const category = await productCategoryService.findById(data.productCategoryId);
      if (!category) {
        res.status(404).json({ error: 'Categoria não encontrada!' });
        return;
      }

      const situation = await productSituationService.findById(data.productSituationId);
      if (!situation) {
        res.status(404).json({ error: 'Situação do produto não encontrada!' });
        return;
      }

      const slug = await productService.generateUniqueSlug(data.name);

      const result = await productService.create({
        name: data.name,
        slug,
        description: data.description,
        price: data.price,
        productCategoryId: data.productCategoryId,
        productSituationId: data.productSituationId,
      });

      res.status(201).json(result);
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao criar product');
    }
  }

  async getAll(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const result = await productService.findAll(page, limit);
      res.json(result);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar products');
    }
  }

  async getById(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      const result = await productService.findById(id);
      if (!result) { res.status(404).json({ error: 'Product não encontrado' }); return; }
      res.json(result);
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao buscar product');
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);

      const existingProduct = await productService.findById(id);
      if (!existingProduct) {
        res.status(404).json({ error: 'Product não encontrado para atualizar' });
        return;
      }

      const body = req.body;
      if (body === null || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length === 0) {
        res.status(400).json({ error: 'Informe ao menos um campo para atualizar.' });
        return;
      }

      const schema = yup.object().shape({
        name: yup
          .string()
          .trim()
          .min(3, 'O campo nome deve ter no mínimo 3 caracteres!')
          .optional(),
        slug: yup
          .string()
          .trim()
          .min(1, 'Informe um slug válido!')
          .optional(),
        description: yup
          .string()
          .trim()
          .min(1, 'Informe uma descrição válida!')
          .optional(),
        price: yup
          .number()
          .typeError('Informe um preço válido!')
          .min(0, 'Informe um preço válido e não negativo!')
          .optional(),
        productCategoryId: yup
          .number()
          .typeError('ID da categoria inválido!')
          .integer('ID da categoria inválido!')
          .positive('ID da categoria inválido!')
          .optional(),
        productSituationId: yup
          .number()
          .typeError('ID da situação inválido!')
          .integer('ID da situação inválido!')
          .positive('ID da situação inválido!')
          .optional(),
      });

      const data = await schema.validate(body, { abortEarly: false, stripUnknown: true });

      if (Object.keys(data).length === 0) {
        res.status(400).json({ error: 'Informe ao menos um campo válido para atualizar.' });
        return;
      }

      const updatePayload: {
        name?: string;
        slug?: string;
        description?: string;
        price?: number;
        productCategoryId?: number;
        productSituationId?: number;
      } = {};

      if (data.name !== undefined) {
        updatePayload.name = data.name;
      }

      if (data.slug !== undefined) {
        const slugExists = await productService.findBySlug(data.slug);
        if (slugExists && slugExists.id !== id) {
          res.status(409).json({
            error: 'Já existe outro produto cadastrado com este slug!',
          });
          return;
        }
        updatePayload.slug = data.slug;
      } else if (data.name !== undefined) {
        updatePayload.slug = await productService.generateUniqueSlug(data.name, id);
      }

      if (data.description !== undefined) {
        updatePayload.description = data.description;
      }

      if (data.price !== undefined) {
        updatePayload.price = data.price;
      }

      if (data.productCategoryId !== undefined) {
        const category = await productCategoryService.findById(data.productCategoryId);
        if (!category) {
          res.status(404).json({ error: 'Categoria não encontrada!' });
          return;
        }
        updatePayload.productCategoryId = data.productCategoryId;
      }

      if (data.productSituationId !== undefined) {
        const situation = await productSituationService.findById(data.productSituationId);
        if (!situation) {
          res.status(404).json({ error: 'Situação do produto não encontrada!' });
          return;
        }
        updatePayload.productSituationId = data.productSituationId;
      }

      const updated = await productService.update(id, updatePayload);
      if (!updated) { res.status(404).json({ error: 'Product não encontrado para atualizar' }); return; }

      const updatedProduct = await productService.findById(id);
      res.json({
        message: 'Product atualizado com sucesso',
        data: updatedProduct,
      });
    } catch (error: unknown) {
      if (error instanceof yup.ValidationError) {
        res.status(400).json({ error: error.errors });
        return;
      }
      sendError(res, error, 'Erro ao atualizar product');
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    try {
      const id = parseInt(req.params.id as string);
      const deleted = await productService.delete(id);
      if (!deleted) { res.status(404).json({ error: 'Product não encontrado para deletar' }); return; }
      res.json({ message: 'Product deletado com sucesso' });
    } catch (error: unknown) {
      sendError(res, error, 'Erro ao deletar product');
    }
  }
}
