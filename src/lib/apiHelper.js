import Vue from 'vue'
// 异步请求插件
import $api from './vue-x-axios'
import Cookies from 'js-cookie'
// 加载进度条
import 'nprogress/nprogress.css'
import NProgress from 'nprogress'

const apiHelper = {
  /**
   * 业务辅助方法，方便请求线上文件进行接口注册
   * @param  {[type]} options.url      线上文件完整url地址，如：https://some-domain.com/web/config/system_config.json
   * @param  {Object} options.router} [description]
   * @return {[type]}                  [description]
   */
  async register ({ url, router, requestIntercept, responseSuccIntercept, responseErrorIntercept } = {}) {
    // 异步请求插件注册
    Vue.use($api)
    let { data: systemConfig } = await Vue.$api({
      url
    })
    let { hosts, api, baseURL } = systemConfig
    let $apiConfig = {
      // axios配置
      globalAxiosOptions: {
        baseURL
      },
      // 接口配置
      apiConfig: api,
      // 请求拦截器
      requestIntercept: requestIntercept === undefined ? config => {
        NProgress.start()
        !config.headers['Authorization'] && (config.headers['Authorization'] = `Bearer ${Cookies.get('token')}`)
        return config
      } : requestIntercept,
      // 响应成功拦截器
      responseSuccIntercept: responseSuccIntercept === undefined ? () => {
        NProgress.done()
      } : responseSuccIntercept,
      // 响应异常拦截器
      responseErrorIntercept: responseErrorIntercept === undefined ? error => {
        NProgress.done()
        if (error.response.status === 401) {
          // token过期，自动跳到登录路由
          router && router.push({ name: 'login' })
        }
      } : responseErrorIntercept
    }
    hosts && hosts.length > 0 && Object.assign($apiConfig, {
      hosts,
      router
    })
    Vue.use(Object.assign({}, $api), $apiConfig)
    return systemConfig
  }
}
export default apiHelper
