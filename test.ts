import {
  Entity,
  Collection,
  ManyToOne,
  PrimaryKey,
  OneToMany,
  MikroORM,
  wrap,
  Property,
  DateTimeType,
  Filter,
  Enum,
} from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";

@Filter({ name: "notDeleted", cond: { deletedAt: null }, default: true })
class BaseEntity {
  @PrimaryKey({ type: "string" })
  id!: string;

  @Property({ type: DateTimeType, nullable: true, default: null })
  deletedAt: Date | null = null;

  get _isDeleted() {
    return this.deletedAt !== null;
  }
}

export enum Role {
  ADMIN = "ADMIN",
  USER = "USER",
}

export enum ProjectMemberType {
  TYPE1 = "TYPE1",
  TYPE2 = "TYPE2",
}

@Entity()
export class RoleEntity extends BaseEntity {
  constructor({ id }: { id: string }) {
    super();
    this.id = id;
  }
}

@Entity()
class User extends BaseEntity {
  @OneToMany(() => ProjectMember, (projectMember) => projectMember.user)
  projectMembers!: Collection<ProjectMember>;

  @ManyToOne(() => RoleEntity, {
    eager: true,
    strategy: "joined",
  })
  role!: RoleEntity;

  constructor({ id, role }: { id: string; role: RoleEntity }) {
    super();
    this.id = id;
    this.role = role;
  }
}

@Entity()
class Project extends BaseEntity {
  @OneToMany(() => ProjectMember, (member) => member.project)
  members!: Collection<ProjectMember>;

  constructor({ id }: { id: string }) {
    super();
    this.id = id;
  }
}

@Entity()
class ProjectMember extends BaseEntity {
  @Enum({
    items: () => ProjectMemberType,
    default: ProjectMemberType.TYPE1,
  })
  type: ProjectMemberType = ProjectMemberType.TYPE1;

  @ManyToOne(() => User)
  user!: User;

  @ManyToOne(() => Project)
  project!: Project;

  constructor({
    id,
    user,
    project,
    type,
  }: {
    id: string;
    user: User;
    project: Project;
    type: ProjectMemberType;
  }) {
    super();
    this.id = id;
    this.user = user;
    this.project = project;
    this.type = type;
  }
}

let orm: MikroORM<SqliteDriver>;

beforeAll(async () => {
  orm = await MikroORM.init({
    driver: SqliteDriver,
    entities: [User, ProjectMember, Project],
    dbName: ":memory:",
    loadStrategy: "select-in",
    allowGlobalContext: true,
  });
  await orm.schema.createSchema();

  const user1 = new User({
    id: "1",
    role: new RoleEntity({ id: "1" }),
  });
  const user2 = new User({
    id: "2",
    role: new RoleEntity({ id: "2" }),
  });
  const project = new Project({ id: "1" });
  orm.em.create(
    ProjectMember,
    new ProjectMember({
      id: "1",
      user: user1,
      project,
      type: ProjectMemberType.TYPE1,
    })
  );
  orm.em.create(
    ProjectMember,
    new ProjectMember({
      id: "2",
      user: user2,
      project,
      type: ProjectMemberType.TYPE1,
    })
  );
  await orm.em.flush();

  user1.deletedAt = new Date();
  await orm.em.persistAndFlush(user1);

  orm.em.clear();
});

afterAll(async () => {
  await orm.close(true);
});

test("should populate project members with specific type using populateWhere", async () => {
  const row = await orm.em.findOneOrFail(
    Project,
    {
      id: "1",
    },
    {
      populate: ["members.user"],
      populateWhere: {
        members: {
          type: ProjectMemberType.TYPE1,
        },
      },
    }
  );
  console.dir(wrap(row).toObject(), { depth: null });
});
