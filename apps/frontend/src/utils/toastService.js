import { useToast } from 'primevue/usetoast'

// Create a composable function that returns toast methods
export function useToastService() {
  const toast = useToast()
  
  const showSuccess = (summary, detail, life = 3000) => {
    toast.add({
      severity: 'success',
      summary,
      detail,
      life
    })
  }

  const showError = (summary, detail, life = 3000) => {
    toast.add({
      severity: 'error',
      summary,
      detail,
      life
    })
  }

  const showWarning = (summary, detail, life = 3000) => {
    toast.add({
      severity: 'warn',
      summary,
      detail,
      life
    })
  }

  const showInfo = (summary, detail, life = 3000) => {
    toast.add({
      severity: 'info',
      summary,
      detail,
      life
    })
  }

  return {
    showSuccess,
    showError,
    showWarning,
    showInfo
  }
}
