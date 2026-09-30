import type { Prisma, PrismaClient, CategorizationSource } from "@prisma/client";
import { matchDefaultRule } from "@/lib/categorization/defaultRules";

type DbClient = PrismaClient | Prisma.TransactionClient;

export interface CategorizeResult {
  categoryId: string | null;
  source: CategorizationSource;
}

async function getSystemCategoryByName(db: DbClient, name: string) {
  return db.category.findFirst({ where: { userId: null, name } });
}

export async function categorize(
  db: DbClient,
  userId: string,
  merchantKey: string,
): Promise<CategorizeResult> {
  const userRule = await db.merchantCategoryRule.findUnique({
    where: { userId_merchantKey: { userId, merchantKey } },
  });
  if (userRule) {
    return { categoryId: userRule.categoryId, source: "USER_RULE" };
  }

  const defaultCategoryName = matchDefaultRule(merchantKey);
  if (defaultCategoryName) {
    const category = await getSystemCategoryByName(db, defaultCategoryName);
    if (category) return { categoryId: category.id, source: "DEFAULT_RULE" };
  }

  const otros = await getSystemCategoryByName(db, "Otros");
  return { categoryId: otros?.id ?? null, source: "UNCATEGORIZED" };
}
