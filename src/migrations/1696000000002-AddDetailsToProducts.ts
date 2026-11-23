import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddDetailsToProducts1696000000002 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("products");

    if (!table?.findColumnByName("slug")) {
      await queryRunner.addColumn(
        "products",
        new TableColumn({
          name: "slug",
          type: "varchar",
          length: "255",
          isUnique: true,
          isNullable: true,
        }),
      );
      await queryRunner.query(
        "UPDATE products SET slug = CONCAT('produto-', id) WHERE slug IS NULL OR slug = ''",
      );
      await queryRunner.query(
        "ALTER TABLE products MODIFY COLUMN slug varchar(255) NOT NULL",
      );
    }

    if (!table?.findColumnByName("description")) {
      await queryRunner.addColumn(
        "products",
        new TableColumn({
          name: "description",
          type: "longtext",
          isNullable: true,
        }),
      );
      await queryRunner.query(
        "UPDATE products SET description = '' WHERE description IS NULL",
      );
      await queryRunner.query(
        "ALTER TABLE products MODIFY COLUMN description longtext NOT NULL",
      );
    }

    if (!table?.findColumnByName("price")) {
      await queryRunner.addColumn(
        "products",
        new TableColumn({
          name: "price",
          type: "decimal",
          precision: 10,
          scale: 2,
          isNullable: false,
          default: 0,
        }),
      );
      await queryRunner.query(
        "ALTER TABLE products MODIFY COLUMN price decimal(10,2) NOT NULL",
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("products");
    if (!table) return;

    for (const column of ["price", "description", "slug"]) {
      if (table.findColumnByName(column)) {
        await queryRunner.dropColumn("products", column);
      }
    }
  }
}
