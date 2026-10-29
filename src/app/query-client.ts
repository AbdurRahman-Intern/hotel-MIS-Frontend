import { QueryClient } from '@tanstack/react-query'
import { AppError } from '@/lib/axios'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      refetchOnWindowFocus: false,
      retry: (n, e) => !(e instanceof AppError && ['forbidden', 'not_found'].includes(e.code)) && n < 1,
    },
  },
})
