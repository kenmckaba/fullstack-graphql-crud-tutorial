-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "createdById" TEXT NOT NULL,
    CONSTRAINT "items_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_items" ("category", "createdAt", "createdById", "id", "name", "updatedAt") SELECT "category", "createdAt", "createdById", "id", "name", "updatedAt" FROM "items";
DROP TABLE "items";
ALTER TABLE "new_items" RENAME TO "items";
CREATE UNIQUE INDEX "items_name_key" ON "items"("name");
CREATE TABLE "new_list_items" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "addedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    CONSTRAINT "list_items_listId_fkey" FOREIGN KEY ("listId") REFERENCES "shopping_lists" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "list_items_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "items" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_list_items" ("addedAt", "id", "isCompleted", "itemId", "listId", "notes", "quantity") SELECT "addedAt", "id", "isCompleted", "itemId", "listId", "notes", "quantity" FROM "list_items";
DROP TABLE "list_items";
ALTER TABLE "new_list_items" RENAME TO "list_items";
CREATE UNIQUE INDEX "list_items_listId_itemId_key" ON "list_items"("listId", "itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
