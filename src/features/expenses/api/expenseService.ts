/**
 * Expense Service (Owner-Only, Cattle Feed Exclusive)
 * Manages expense categories, operating expense entries, and prevents
 * double counting of freight already allocated to COGS.
 */

import { supabase } from '@/lib/supabase';
import { rupeesToPaise } from '@/lib/money';
import type { Expense, ExpenseCategory } from '@/lib/database.types';
import type { ExpenseFormData, ExpenseCategoryFormData } from '@/lib/validation';

export type ExpenseWithCategory = Expense & {
  category: ExpenseCategory;
};

export async function fetchExpenseCategories(
  businessId: string,
): Promise<ExpenseCategory[]> {
  const { data, error } = await supabase
    .from('expense_categories')
    .select('*')
    .eq('business_id', businessId)
    .order('name', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch expense categories: ${error.message}`);
  }

  return data ?? [];
}

export async function createExpenseCategory(
  businessId: string,
  data: ExpenseCategoryFormData,
): Promise<ExpenseCategory> {
  const { data: cat, error } = await supabase
    .from('expense_categories')
    .insert({
      business_id: businessId,
      name: data.name,
      code: data.code || null,
      description: data.description || null,
      is_active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create category: ${error.message}`);
  }

  return cat;
}

export async function fetchExpenses(
  businessId: string,
  options?: {
    categoryId?: string;
    fromDate?: string;
    toDate?: string;
  },
): Promise<ExpenseWithCategory[]> {
  let query = supabase
    .from('expenses')
    .select('*, category:expense_categories(*)')
    .eq('business_id', businessId)
    .order('expense_date', { ascending: false });

  if (options?.categoryId) {
    query = query.eq('category_id', options.categoryId);
  }
  if (options?.fromDate) {
    query = query.gte('expense_date', options.fromDate);
  }
  if (options?.toDate) {
    query = query.lte('expense_date', options.toDate);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Failed to fetch expenses: ${error.message}`);
  }

  return data ?? [];
}

export async function createExpense(
  businessId: string,
  data: ExpenseFormData,
): Promise<Expense> {
  const amountPaise = rupeesToPaise(data.amountRupees);

  const { data: exp, error } = await supabase
    .from('expenses')
    .insert({
      business_id: businessId,
      category_id: data.categoryId,
      amount_paise: amountPaise,
      expense_date: data.expenseDate,
      payment_mode: data.paymentMode,
      reference_number: data.referenceNumber || null,
      notes: data.notes || null,
      customer_id: data.customerId || null,
      load_reference: data.loadReference || null,
      is_load_allocated: data.isLoadAllocated,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create expense: ${error.message}`);
  }

  return exp;
}
