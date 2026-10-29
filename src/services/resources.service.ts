import { tenantResource } from './tenant-resource'
import type { Employee, Expense, ExternalIncome, Loan, Partner, SalaryPayment } from '@/types'

export const employeeService = {
  ...(() => { const r = tenantResource<Employee>('employees', 'emp'); return { getEmployees: r.list, getEmployee: r.get, createEmployee: r.create, updateEmployee: r.update, deleteEmployee: r.remove } })(),
}
export const salaryService = (() => { const r = tenantResource<SalaryPayment>('salaryPayments', 'sal'); return { getPayments: r.list, createPayment: r.create, updatePayment: r.update, deletePayment: r.remove } })()
export const partnerService = (() => { const r = tenantResource<Partner>('partners', 'par'); return { getPartners: r.list, getPartner: r.get, createPartner: r.create, updatePartner: r.update, deletePartner: r.remove } })()
export const loanService = (() => { const r = tenantResource<Loan>('loans', 'loan'); return { getLoans: r.list, createLoan: r.create, updateLoan: r.update, deleteLoan: r.remove } })()
export const expenseService = (() => { const r = tenantResource<Expense>('expenses', 'exp'); return { getExpenses: r.list, getExpense: r.get, createExpense: r.create, updateExpense: r.update, deleteExpense: r.remove } })()
export const incomeService = (() => { const r = tenantResource<ExternalIncome>('externalIncome', 'inc'); return { getIncome: r.list, createIncome: r.create, updateIncome: r.update, deleteIncome: r.remove } })()
