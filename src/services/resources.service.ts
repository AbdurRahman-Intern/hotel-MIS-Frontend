import { api } from '@/lib/axios'
import { tenantResource } from './tenant-resource'
import type { Employee, Expense, ExternalIncome, Loan, Partner, PartnerTransaction, SalaryPayment } from '@/types'

const DEMO = import.meta.env.VITE_DEMO_MODE === 'true'

const employees = tenantResource<Employee>('employees', 'emp')
export const employeeService = {
  getEmployees: employees.list,
  getEmployee: employees.get,
  createEmployee: employees.create,
  updateEmployee: employees.update,
  deleteEmployee: employees.remove,
}

const salaries = tenantResource<SalaryPayment>(DEMO ? 'salaryPayments' : 'salary-payments', 'sal')
export const salaryService = {
  getPayments: salaries.list,
  createPayment: salaries.create,
  updatePayment: salaries.update,
  deletePayment: salaries.remove,
}

const partners = tenantResource<Partner>('partners', 'par')
export const partnerService = {
  getPartners: partners.list,
  getPartner: partners.get,
  createPartner: partners.create,
  updatePartner: partners.update,
  deletePartner: partners.remove,
  async addTransaction(partner: Partner, transaction: PartnerTransaction): Promise<Partner> {
    if (DEMO) return partners.update(partner.id, { transactions: [...partner.transactions, transaction] })
    const { data } = await api.post<Partner>(`/partners/${partner.id}/transactions`, transaction)
    return data
  },
}

const loans = tenantResource<Loan>('loans', 'loan')
export const loanService = {
  getLoans: loans.list,
  createLoan: loans.create,
  deleteLoan: loans.remove,
  async addRepayment(loan: Loan, repayment: Loan['repayments'][number]): Promise<Loan> {
    if (DEMO) return loans.update(loan.id, { repayments: [...loan.repayments, repayment] })
    const { data } = await api.post<Loan>(`/loans/${loan.id}/repayments`, repayment)
    return data
  },
}

const expenses = tenantResource<Expense>('expenses', 'exp')
export const expenseService = {
  getExpenses: expenses.list,
  getExpense: expenses.get,
  createExpense: expenses.create,
  updateExpense: expenses.update,
  deleteExpense: expenses.remove,
}

const income = tenantResource<ExternalIncome>(DEMO ? 'externalIncome' : 'external-income', 'inc')
export const incomeService = {
  getIncome: income.list,
  createIncome: income.create,
  updateIncome: income.update,
  deleteIncome: income.remove,
}
