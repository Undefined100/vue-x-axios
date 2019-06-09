import Vue from 'vue'
// 异步请求插件
import $api from './vue-x-axios'
// 加载进度条
import 'nprogress/nprogress.css'
import NProgress from 'nprogress'

const apiHelper = {
  /**
   * 业务辅助方法，方便请求线上文件进行接口注册
   * @param  {[type]} options.config      json配置对象或者线上文件完整url地址
   * @param  {Object} options.router} [description]
   * @return {[Object]}                  [系统配置对象]
   */
  async register ({ systemConfig, router, requestIntercept, responseSuccIntercept, responseErrorIntercept } = {}) {
    if (!systemConfig) {
      console.error('请传入接口配置信息！')
      return
    }
    // 异步请求插件注册
    Vue.use($api)
    if (typeof(systemConfig) === 'string') {
      systemConfig = (await Vue.$api({
        systemConfig
      })).data || {}
    }
    let { hosts, api, globalAxiosOptions } = systemConfig
    let $apiConfig = {
      // axios配置
      globalAxiosOptions,
      // 接口配置
      apiConfig: api,
      // 请求拦截器
      requestIntercept: (req) => {
        NProgress.start()
        requestIntercept && requestIntercept(req)
      },
      // 响应成功拦截器
      responseSuccIntercept: (resp) => {
        NProgress.done()
        responseSuccIntercept && responseSuccIntercept(resp)
      },
      // 响应异常拦截器
      responseErrorIntercept: () => {
        NProgress.done()
        responseErrorIntercept && responseErrorIntercept(arguments)
      }
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
