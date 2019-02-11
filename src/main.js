import Vue from 'vue'
import VuePlugin from './lib/'
import App from './App.vue'

Vue.use(VuePlugin, {
  // globalAxiosOptions配置与axios配置一致，axios配置参考axios配置一节
  globalAxiosOptions: {
    // baseURL: 'http://localhost:9000'
  },
  // 模块host设置
  hosts: [{
    url: 'https://some-domain.com/api/',
    routeKeys: ['faf1b16f-8cf4-48ca-a4f5-0d8f2ba787a9']
  }],
  // 配置型接口
  apiConfig: [{
    name: '测试接口',
    method: 'dataV1',
    url: '/api/v1/basic/data',
    type: 'get'
  }, {
    name: '执行接口',
    method: 'dataV2',
    url: '/api/v2/basic/data/execute',
    type: 'post',
    /* 静态参数 */
    data: {
      lcontent: '测试参数' // 请求体参数
    },
    params: {
      key: 'i_s_sys_log' // url参数
    }
  }]
})

let vm = new Vue({
  el: '#app',
  render: h => h(App)
})

Vue.use(vm)
