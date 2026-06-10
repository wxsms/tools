import DefaultTheme from 'vitepress/theme'
import HelloTool from './components/HelloTool.vue'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('HelloTool', HelloTool)
  }
}
