import {
  Entity,
  PrimaryKey,
  MikroORM,
  Property,
  Enum,
  ManyToMany,
} from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";

class BaseEntity {
  @PrimaryKey({ type: "number", autoincrement: true })
  id?: number;

  @Property({ type: "string", unique: true })
  uuid!: string;
}

enum Entity1Status {
  ACTIVE = "active",
  PROCESSING = "processing",
  INACTIVE = "inactive",
}

@Entity()
export class Entity1 extends BaseEntity {
  @Enum({
    items: () => Entity1Status,
    customOrder: [
      Entity1Status.ACTIVE,
      Entity1Status.PROCESSING,
      Entity1Status.INACTIVE,
    ],
  })
  status!: Entity1Status;

  @ManyToMany({
    entity: () => Entity2,
    eager: true,
    mappedBy: "entity1",
  })
  entity2!: Entity2[];
}

@Entity()
export class Entity2 extends BaseEntity {
  @ManyToMany({
    entity: () => Entity1,
    referenceColumnName: "uuid",
    columnType: "uuid",
    fieldName: "entity1_id",
  })
  entity1!: Entity1[];
}

let orm: MikroORM<SqliteDriver>;

beforeAll(async () => {
  orm = await MikroORM.init({
    driver: SqliteDriver,
    entities: [Entity1, Entity2],
    dbName: ":memory:",
    loadStrategy: "joined",
    allowGlobalContext: true,
    debug: true,
  });
  await orm.schema.createSchema();

  orm.em.clear();
});

afterAll(async () => {
  await orm.close(true);
});

test("should populate user with referenceColumnName", async () => {
  const qb = orm.em.createQueryBuilder(Entity1);

  qb.select("*")
    .leftJoinAndSelect("entity2", "e2")
    .orderBy({ status: "desc" })
    .limit(3)
    .offset(2);

  console.log(qb.getFormattedQuery());
});
