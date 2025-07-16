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
  ManyToMany,
  Unique,
  OneToOne,
} from "@mikro-orm/core";
import { SqliteDriver } from "@mikro-orm/sqlite";
import { PostgreSqlDriver } from "@mikro-orm/postgresql";

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

export enum Locale {
  EN = "en",
  KO = "ko",
}

export enum Role {
  ADMIN = "ADMIN", // ENKI Platform Team

  LEADER = "LEADER", // ENKI Consulting Leaders
  USER = "USER", // ENKI Members

  ORG_ADMIN = "ORG_ADMIN", // Organization Admin
  ORG_MANAGER = "ORG_MANAGER", // Organization Manager
  ORG_USER = "ORG_USER", // Organization User

  GUEST = "GUEST", // Unknown
}

export enum HTTPMethod {
  GET = "GET",
  POST = "POST",
  PUT = "PUT",
  DELETE = "DELETE",
  PATCH = "PATCH",
  ALL = "ALL",
}

export enum ProjectMemberType {
  PENTESTER = "PENTESTER",
  ORGANIZATION = "ORGANIZATION",
}

export enum FileType {
  ORGANIZATION_PROFILE = "ORGANIZATION_PROFILE",
  USER_PROFILE = "USER_PROFILE",
  PROJECT = "PROJECT",
  PROJECT_LOUNGE = "PROJECT_LOUNGE",
  ISSUE = "ISSUE",
  NEWS_THUMBNAIL = "NEWS_THUMBNAIL",
}

export enum FileStatus {
  PENDING = "PENDING",
  UPLOADED = "UPLOADED",
  FAILED = "FAILED",
}

@Entity()
export class RoleEntity extends BaseEntity {
  @Enum({ items: () => Role, unique: true })
  name!: Role;

  @ManyToMany(() => PermissionEntity, (permission) => permission.roles, {
    owner: true,
  })
  permissions!: Collection<PermissionEntity>;

  constructor({ id, name }: { id: string; name: Role }) {
    super();
    this.id = id;
    this.name = name;
  }
}

@Entity()
@Unique({ properties: ["method", "path"] })
export class PermissionEntity extends BaseEntity {
  @Property({ nullable: false })
  path!: string;

  @Enum(() => HTTPMethod)
  method!: HTTPMethod;

  @ManyToMany(() => RoleEntity, (role) => role.permissions)
  roles!: RoleEntity[];
}

@Entity()
class User extends BaseEntity {
  @OneToMany(() => ProjectMember, (projectMember) => projectMember.user, {
    strategy: "joined",
  })
  joinedProjects!: Collection<ProjectMember>;

  @Property({ nullable: true, default: null })
  organizationId: number | null = null;

  @ManyToOne(() => RoleEntity, {
    eager: true,
    strategy: "joined",
  })
  role!: RoleEntity;

  @Property({ nullable: true, default: null })
  note: string | null = null; // 비고

  @Enum({
    items: () => Locale,
    comment: "마지막 사용 언어",
    default: Locale.KO,
    nullable: true,
  })
  locale?: Locale = Locale.KO;

  constructor({ id, role }: { id: string; role: RoleEntity }) {
    super();
    this.id = id;
    this.role = role;
  }
}

@Entity()
class Project extends BaseEntity {
  @Property()
  name: string = "Project";

  @Property()
  col1: string = "col1";

  @Property()
  col2: string = "col2";

  @Property()
  col3: string = "col3";

  @Property()
  col4: string = "col4";

  @OneToMany(() => ProjectMember, (member) => member.project, {
    eager: false,
  })
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
    comment: "프로젝트 멤버 유형",
    default: ProjectMemberType.PENTESTER,
  })
  type: ProjectMemberType = ProjectMemberType.PENTESTER;

  @ManyToOne(() => User, { eager: false })
  user!: User;

  @ManyToOne(() => Project, {
    eager: false,
    strategy: "joined",
  })
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
    // debug: true,
    entities: [User, ProjectMember, Project],
    dbName: ":memory:",
    loadStrategy: "select-in",
    allowGlobalContext: true,
  });
  await orm.schema.dropSchema();
  await orm.schema.createSchema();

  const user1 = new User({
    id: "1",
    role: new RoleEntity({ id: "1", name: Role.ADMIN }),
  });
  const user2 = new User({
    id: "2",
    role: new RoleEntity({ id: "2", name: Role.USER }),
  });
  const project = new Project({ id: "1" });
  orm.em.create(
    ProjectMember,
    new ProjectMember({
      id: "1",
      user: user1,
      project,
      type: ProjectMemberType.PENTESTER,
    })
  );
  orm.em.create(
    ProjectMember,
    new ProjectMember({
      id: "2",
      user: user2,
      project,
      type: ProjectMemberType.PENTESTER,
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

test("custom type pk entity not being populated", async () => {
  const row = await orm.em.findOneOrFail(
    Project,
    {
      id: "1",
    },
    {
      populate: ["members", "members.user"],
      populateWhere: {
        members: {
          type: ProjectMemberType.PENTESTER,
        },
      },
    }
  );
  console.dir(wrap(row).toObject(), { depth: null });
});
