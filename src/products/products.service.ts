import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { validate as isUUID } from 'uuid';
import { ProductImage, Product } from './entities';
import { User } from 'src/auth/entities/user.entity';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');

  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
    @InjectRepository(ProductImage)
    private readonly productImageRepository: Repository<ProductImage>,
    private readonly datasource: DataSource,
  ) {}

  async create(createProductDto: CreateProductDto, user: User) {
    try {
      const { images = [], ...productProperties } = createProductDto;

      const product = this.productRepository.create({
        ...productProperties,
        images: images.map((image) =>
          this.productImageRepository.create({ url: image }),
        ),
        user,
      });
      await this.productRepository.save(product);
      return product;
    } catch (error) {
      this.handleErrorsDB(error);
    }
  }

  async findAll(paginationDto: PaginationDto) {
    try {
      const { limit = 5, offset = 0 } = paginationDto;
      const product = await this.productRepository.find({
        take: limit,
        skip: offset,
        relations: {
          images: true,
        },
      });

      return product.map(({ images, ...rest }) => ({
        ...rest,
        images: images.map((image) => image.url),
      }));
    } catch (error) {
      this.handleErrorsDB(error);
    }
  }

  async findOne(term: string) {
    let product: Product;
    try {
      if (isUUID(term)) {
        product = await this.productRepository.findOneBy({ id: term });
      } else {
        const queryBuilder = this.productRepository.createQueryBuilder('prod');
        product = await queryBuilder
          .where('UPPER(title) =:title or slug =:slug', {
            title: term.toUpperCase(),
            slug: term.toLowerCase(),
          })
          .leftJoinAndSelect('prod.images', 'prodImages')
          .getOne();
      }
    } catch (error) {
      this.handleErrorsDB(error);
    }
    if (!product) {
      throw new NotFoundException(`Product ${term}, not found!`);
    }
    return product;
  }

  async update(id: string, updateProductDto: UpdateProductDto, user: User) {
    const { images, ...toUpdate } = updateProductDto;

    const product = await this.productRepository.preload({
      id: id,
      ...toUpdate,
      user,
    });

    if (!product)
      throw new NotFoundException(`Product with id: ${id} not found`);

    const queryRunner = this.datasource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      if (images) {
        await queryRunner.manager.delete(ProductImage, { product: { id } });
      }
      product.images = images.map((image) =>
        this.productImageRepository.create({ url: image }),
      );

      await queryRunner.manager.save(product);
      await queryRunner.commitTransaction();
      await queryRunner.release();

      return product;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      await queryRunner.release();
      this.handleErrorsDB(error);
    }
  }

  async remove(id: string) {
    const product = await this.findOne(id);
    try {
      await this.productRepository.remove(product);
    } catch (error) {
      this.handleErrorsDB(error);
    }
  }

  private handleErrorsDB(error) {
    this.logger.error(error);

    if (error.code === '23502') throw new BadRequestException(error.detail);

    throw new InternalServerErrorException(
      'System error, please contact the system administrator',
    );
  }

  async deleteAllProducts() {
    const query = this.productRepository.createQueryBuilder('product');
    try {
      return await query.delete().where({}).execute();
    } catch (error) {
      this.handleErrorsDB(error);
    }
  }
}
