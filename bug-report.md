# populateWhere not working properly with nested populate

## Describe a bug

When using `populateWhere` with nested populate (e.g., `populate: ["members.user"]`), the `populateWhere` condition is incorrectly being applied to the nested entity instead of the intended entity. This causes a `DriverException` because MikroORM tries to query the nested entity with properties that don't exist on that entity.

**Expected behavior:**

- Only ProjectMembers with `type: ProjectMemberType.TYPE1` should be populated
- The nested `user` relation should only be populated for those filtered members

**Actual behavior:**

- Query fails with `DriverException: Trying to query by not existing property User.type`
- The `populateWhere` condition for `members` is incorrectly being applied to the nested `User` entity instead of the `ProjectMember` entity

## Reproduction

The issue can be reproduced with the following setup:

**Entities:**

- `BaseEntity` with soft delete filter (`@Filter`)
- `Project` entity with `@OneToMany` relation to `ProjectMember`
- `ProjectMember` entity with enum `type` field and relations to `User` and `Project`
- `User` entity with relation to `RoleEntity`

**Problematic query:**

```typescript
const row = await orm.em.findOneOrFail(
  Project,
  { id: "1" },
  {
    populate: ["members.user"],
    populateWhere: {
      members: {
        type: ProjectMemberType.TYPE1,
      },
    },
  }
);
```

**Full reproduction code:**
See `test.ts` file in the repository: https://github.com/rmagur1203/mikro-orm-populate-bug

It contains a complete minimal reproduction case with:

- Entity definitions
- Test data setup
- The failing query that demonstrates the issue

**Additional context:**
This issue affects scenarios where you need to conditionally populate nested relations based on intermediate entity properties, which is a common use case for filtering related data.

**Note:** While this reproduction case uses `loadStrategy: "select-in"` for simplicity, the same bug occurs in production environments using only `strategy: "joined"` on individual relations. The issue is not limited to a specific loading strategy.
