import { NextResponse } from "next/server";
import { z } from "zod";
import { categories as defaultCategories } from "@/lib/data";
import { prisma } from "@/lib/prisma";
import { budgetSchema, categorySchema, transactionSchema } from "@/lib/schema";

const workspaceQuerySchema = z.object({
  userId: z.string().min(1)
});

const workspaceSaveSchema = z.object({
  userId: z.string().min(1),
  categories: z.array(categorySchema.extend({ id: z.string().min(1) })),
  transactions: z.array(transactionSchema.extend({ id: z.string().min(1) })),
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

  const [categories, transactions, budgets] = await Promise.all([
    prisma.category.findMany({
      where: { userId: parsed.data.userId },
      orderBy: { createdAt: "asc" }
    }),
    prisma.transaction.findMany({
      where: { userId: parsed.data.userId },
      orderBy: { date: "desc" }
    }),
    prisma.budget.findMany({
      where: { userId: parsed.data.userId },
      orderBy: { createdAt: "desc" }
    })
  ]);

  return NextResponse.json({
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
      type: category.type
    })),
    transactions: transactions.map((transaction) => ({
      id: transaction.id,
      amount: Number(transaction.amount),
      categoryId: transaction.categoryId,
      date: transaction.date.toISOString().slice(0, 10),
      subcategory: transaction.merchant,
      note: transaction.note ?? "",
      time: transaction.date.toISOString().slice(11, 16),
      type: transaction.type
    }))
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const parsed = workspaceSaveSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid workspace payload." }, { status: 400 });
  }

  const { budgets, categories, transactions, userId } = parsed.data;

  await prisma.$transaction(async (tx) => {
    await tx.budget.deleteMany({ where: { userId } });
    await tx.transaction.deleteMany({ where: { userId } });
    await tx.category.deleteMany({ where: { userId } });

    if (categories.length > 0) {
      await tx.category.createMany({
        data: categories.map((category) => ({
          id: category.id,
          color: category.color,
          name: category.name,
          type: category.type,
          userId
        }))
      });
    }

    if (transactions.length > 0) {
      await tx.transaction.createMany({
        data: transactions.map((transaction) => ({
          id: transaction.id,
          amount: transaction.amount,
          categoryId: transaction.categoryId,
          date: new Date(`${transaction.date}T${transaction.time}:00.000Z`),
          merchant: transaction.subcategory,
          note: transaction.note || null,
          type: transaction.type,
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
      type: category.type,
      userId
    }))
  });
}
