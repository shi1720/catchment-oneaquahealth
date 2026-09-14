import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
export const workspaces = sqliteTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    data: text("data").notNull(),
    revision: integer("revision").notNull().default(0),
    createdAt: integer("created_at").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (table) => [index("idx_workspaces_expiry").on(table.expiresAt)],
);
