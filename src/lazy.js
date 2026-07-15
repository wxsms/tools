import { defineAsyncComponent } from 'vue'
import RouteLoading from './components/RouteLoading.vue'
import RouteError from './components/RouteError.vue'

export function lazy(loader) {
  return defineAsyncComponent({
    loader,
    loadingComponent: RouteLoading,
    errorComponent: RouteError,
    delay: 0,
    timeout: 30000,
  })
}
