import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddAuthColumnsToUsers1696000000001 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("users");

    if (!table?.findColumnByName("password")) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "password",
          type: "varchar",
          length: "255",
          isNullable: false,
          default: "''",
        }),
      );
      await queryRunner.query(
        "ALTER TABLE users MODIFY COLUMN password varchar(255) NOT NULL",
      );
    }

    if (!table?.findColumnByName("tipoUsuario")) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "tipoUsuario",
          type: "enum",
          enum: ["ADMIN", "USER"],
          default: "'USER'",
          isNullable: false,
        }),
      );
    }

    if (!table?.findColumnByName("recoverPassword")) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "recoverPassword",
          type: "varchar",
          length: "255",
          isUnique: true,
          isNullable: true,
        }),
      );
    }

    if (!table?.findColumnByName("recoverPasswordExpiresAt")) {
      await queryRunner.addColumn(
        "users",
        new TableColumn({
          name: "recoverPasswordExpiresAt",
          type: "timestamp",
          isNullable: true,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const table = await queryRunner.getTable("users");
    if (!table) return;

    for (const column of [
      "recoverPasswordExpiresAt",
      "recoverPassword",
      "tipoUsuario",
      "password",
    ]) {
      if (table.findColumnByName(column)) {
        await queryRunner.dropColumn("users", column);
      }
    }
  }
}
