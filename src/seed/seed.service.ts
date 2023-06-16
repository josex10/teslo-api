import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ProductsService } from '../products/products.service';
import { initialData } from './data/seed-data';
import { User } from '../auth/entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SeedService {
  constructor(
    private readonly productService: ProductsService,
    @InjectRepository(User) private readonly userRepository: Repository<User>,
  ) {}
  async excecuteSeed() {
    await this.deleteTables();
    const superUser = await this.insertUsers();
    await this.insertnewProducts(superUser);
    return 'Seed data excecuted successfully';
  }

  private async deleteTables() {
    await this.productService.deleteAllProducts();

    const userQueryBuilder = this.userRepository.createQueryBuilder();
    await userQueryBuilder.delete().where({}).execute();
  }

  private async insertUsers() {
    const seedUsers = initialData.users;
    const users: User[] = [];

    seedUsers.forEach((user) => {
      users.push(
        this.userRepository.create({
          ...user,
          password: bcrypt.hashSync(user.password, 10),
        }),
      );
    });

    await this.userRepository.save(users);

    return users[0];
  }

  private async insertnewProducts(user: User) {
    const seedProducts = initialData.products;

    const insertPromises = [];
    seedProducts.forEach((product) => {
      insertPromises.push(this.productService.create(product, user));
    });

    await Promise.all(insertPromises);

    return true;
  }
}
