import { NextResponse } from "next/server";
import { z } from "zod";
import {
  accounts as defaultAccounts,
  categories as defaultCategories
} from "@/lib/data";
import { prisma } from "@/lib/prisma";
import {
  accountSchema,
  budgetSchema,
  categorySchema,
  transactionSchema,
  transferSchema
} from "@/lib/schema";
import { getSubcategoriesForCategory } from "@/lib/kwarta/helpers";

const workspaceQuerySchema = z.object({
  userId: z.string().min(1)
});

const transferSaveSchema = z.object({
  id: z.string().min(1),
  fromAccountId: z.string().min(1),
  toAccountId: z.string().min(1),
  amount: z.coerce.number(),
  fee: z.coerce.number().default(0),
  note: z.string().optional(),
  date: z.string().min(1),
  time: z.string()
});

const categorySaveSchema = categorySchema.extend({
  id: z.string().min(1),
  subcategories: z.array(z.string()).default([])
});

const workspaceSaveSchema = z.object({
  userId: z.string().min(1),
  accounts: z.array(accountSchema.extend({ id: z.string().min(1) })),
  categories: z.array(categorySaveSchema),
  transactions: z.array(transactionSchema.extend({ id: z.string().min(1) })),
  transfers: z.array(transferSaveSchema).default([]),
  budgets: z.array(budgetSchema.extend({ id: z.string().min(1) }))
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = workspaceQuerySchema.safeParse({
    userId: url.searchParams.get("userId")
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  await seedDefaultCategories(parsed.data.userId);
  await seedDefaultAccounts(parsed.data.userId);

  const [accounts, categories, transactions, transfers, budgets] =
    await Promise.all([
      prisma.account.findMany({
        where: { userId: parsed.data.userId },
        orderBy: { createdAt: "asc" }
      }),
      prisma.category.findMany({
        where: { userId: parsed.data.userId },
        orderBy: { createdAt: "asc" }
      }),
      prisma.transaction.findMany({
        where: { userId: parsed.data.userId },
        orderBy: { date: "desc" }
      }),
      prisma.transfer.findMany({
        where: { userId: parsed.data.userId },
        orderBy: { date: "desc" }
      }),
      prisma.budget.findMany({
        where: { userId: parsed.data.userId },
        orderBy: { createdAt: "desc" }
      })
    ]);

  return NextResponse.json({
    accounts: accounts.map((account) => ({
      id: account.id,
      name: account.name,
      type: account.type,
      color: account.color,
      icon: account.icon,
      openingBalance: Number(account.openingBalance),
      provider: account.provider ?? undefined,
      externalId: account.externalId ?? undefined,
      syncStatus: account.syncStatus
    })),
    budgets: budgets.map((budget) => ({
      id: budget.id,
      categoryId: budget.categoryId,
      limit: Number(budget.limit),
      month: budget.month
    })),
    categories: categories.map((category) => ({
      id: category.id,
      color: category.color,
      name: category.name,
      subcategories:
        (category as { subcategories?: string[] }).subcategories ?? [],
      type: category.type
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      categoryId: transaction.categoryId,
      accountId: transaction.accountId ?? undefined,
      date: transaction.date.toISOString().slice(0, 10),
      subcategory: transaction.merchant,
      note: transaction.note ?? "",
      time: transaction.date.toISOString().slice(11, 16),
      type: transaction.type
    })),
    transfers: transfers.map((transfer) => ({
      id: transfer.id,
      fromAccountId: transfer.fromAccountId,
      toAccountId: transfer.toAccountId,
      amount: Number(transfer.amount),
      fee: Number(transfer.fee),
      note: transfer.note ?? "",
      date: transfer.date.toISOString().slice(0, 10),
      time: transfer.date.toISOString().slice(11, 16)
    }))
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = workspaceSaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspace payload." }, { status: 400 });
  }

  const { accounts, budgets, categories, transactions, transfers, userId } =
    parsed.data;
  const accountIds = new Set(accounts.map((account) => account.id));

  await prisma.$transaction(async (tx) => {
    await tx.budget.deleteMany({ where: { userId } });
    await tx.transfer.deleteMany({ where: { userId } });
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.category.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });

    if (accounts.length > 0) {
      await tx.account.createMany({
        data: accounts.map((account) => ({
          id: account.id,
          name: account.name,
          type: account.type,
          color: account.color,
          icon: account.icon,
          openingBalance: account.openingBalance,
          provider: account.provider || null,
          externalId: account.externalId || null,
          syncStatus: account.syncStatus,
          userId
        }))
      });
    }

    if (categories.length > 0) {
      await tx.category.createMany({
        data: categories.map((category) => ({
          id: category.id,
          color: category.color,
          name: category.name,
          subcategories: category.subcategories,
          type: category.type,
          userId
        })) as any
      });
    }

    if (transactions.length > 0) {
      await tx.transaction.createMany({
        data: transactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          accountId:
            transaction.accountId && accountIds.has(transaction.accountId)
              ? transaction.accountId
              : null,
          date: new Date(`${transaction.date}T${transaction.time}:00.000Z`),
          merchant: transaction.subcategory,
          note: transaction.note || null,
          type: transaction.type,
          userId
        }))
      });
    }

    const validTransfers = transfers.filter(
      (transfer) =>
        accountIds.has(transfer.fromAccountId) &&
        accountIds.has(transfer.toAccountId) &&
        transfer.fromAccountId !== transfer.toAccountId
    );

    if (validTransfers.length > 0) {
      await tx.transfer.createMany({
        data: validTransfers.map((transfer) => ({
          id: transfer.id,
          amount: transfer.amount,
          fee: transfer.fee,
          fromAccountId: transfer.fromAccountId,
          toAccountId: transfer.toAccountId,
          date: new Date(`${transfer.date}T${transfer.time}:00.000Z`),
          note: transfer.note || null,
          userId
        }))
      });
    }

    if (budgets.length > 0) {
      await tx.budget.createMany({
        data: budgets.map((budget) => ({
          id: budget.id,
          categoryId: budget.categoryId,
          limit: budget.limit,
          month: budget.month,
          userId
        }))
      });
    }
  });

  return NextResponse.json({ ok: true });
}

async function seedDefaultCategories(userId: string) {
  const existing = await prisma.category.count({
    where: { userId }
  });

  if (existing > 0) {
    return;
  }

  await prisma.category.createMany({
    data: defaultCategories.map((category) => ({
      id: `${userId}-${category.id}`,
      color: category.color,
      name: category.name,
      subcategories: getSubcategoriesForCategory(category),
      type: category.type,
      userId
    })) as any
  });
}

async function seedDefaultAccounts(userId: string) {
  const existing = await prisma.account.count({
    where: { userId }
  });

  if (existing > 0) {
    return;
  }

  await prisma.account.createMany({
    data: defaultAccounts.map((account) => ({
      id: `${userId}-${account.id}`,
      name: account.name,
      type: account.type,
      color: account.color,
      icon: account.icon,
      openingBalance: account.openingBalance,
      provider: account.provider || null,
      externalId: account.externalId || null,
      syncStatus: account.syncStatus ?? "manual",
      userId
    }))
  });
}
