# vue-x-axios

> 基于axios扩展的Vue异步请求插件，为前端实现API统一管理的解决方案。

## 安装

```Bash
npm install vue-x-axios --save
```

## 注册

在入口文件main.js文件中
```js
import Vue from 'vue'
import $api from 'vue-x-axios'

// 注册插件
Vue.use($api)

// 或者，你也可以传入可选参数，完整配置参数如下：
Vue.use($api, {
  // globalAxiosOptions配置与axios配置一致，axios配置参考axios配置一节
  globalAxiosOptions: {
    baseURL: 'https://some-domain.com/api/'
  },

  // 请求拦截器
  requestIntercept(config){
    // 自定义处理逻辑
  },

  // 响应拦截器
  responseSuccIntercept(resp){
    // 自定义处理逻辑
  },

  // 响应异常拦截器
  responseErrorIntercept(err){
    // 自定义处理逻辑
  },

  // API配置信息
  apiConfig：[{
    name: '通用查询接口',
    method: 'queryData',
    url: '/api/v1/basic/queryData'
  }, {
    name: '通用查询分页接口',
    method: 'pagingData',
    url: '/api/v1/basic/pagingData',
    type: 'get'
  }, {
    name: '通用新增接口',
    method: 'add',
    url: '/api/v1/basic/execute',
    type: 'post',
    /*静态参数*/
    data:{
      lcontent:'测试数据' //请求体参数
    }，
    params:{
      key:'i_s_sys_log'// url参数
    }
  }, {
    name: '路径参数型接口',
    method: 'getUser',
    url: '/api/v1/getUser/{id}'
  }]
})
```

### 最佳实践

1、将API的配置统一在一个文件中进行管理
2、在注册异步请求插件的地方，将API配置文件引入进行注册，如：
```
├── src
│   ├── api.js // 接口配置文件
│   ├── main.js
```
api.js文件内容，如下：

```js
export default
[{
  name: '通用查询接口',
  method: 'queryData',
  url: '/api/v1/basic/queryData'
}, {
  name: '通用查询分页接口',
  method: 'pagingData',
  url: '/api/v1/basic/pagingData',
  type: 'get'
}, {
  name: '通用新增接口',
  method: 'add',
  url: '/api/v1/basic/execute',
  type: 'post',
  /*静态参数*/
  data:{
    lcontent:'测试数据' //请求体参数
  }，
  params:{
    key:'i_s_sys_log'// url参数
  }
}, {
  name: '路径参数型接口',
  method: 'getUser',
  url: '/api/v1/getUser/{id}'
}]
```

在入口文件main.js文件中
```js
import Vue from 'vue'
import apiConfig from './api'
import $api from 'vue-x-axios'

// 注册插件
Vue.use($api,{
  apiConfig
})
```
如果需要实时请求线上接口配置的场景，请参考[业务辅助方法](#业务辅助方法)一节。

## 使用方式

> 注册后，在组件环境中，通过this.\$api来调用，this即组件实例对象；当非组件环境中，通过Vue.\$api来调用。

### 配置型接口请求

> 在注册的地方需要将apiConfig配置传入，比如根据以上传入的API配置信息，你就可以在组件中使用以下方式调用：

```js
// 使用方式
this.$api.queryData({
  // 与axios配置一致
  params: {
    key: 's_sys_menu_list',
    page_id: 90,
    user_id: 0
  }
}).then((resp) => {
  console.log(resp)
}).catch(err => {
  console.log(err)
}).finally(() => {
  console.log('done')
})

this.$api.pagingData({}).then().catch().finally()
```

### 路径参数型请求

> 在配置型接口基础上，会默认扩展一种路径参数型请求，通过对应方法的restful方法发起请求，并将匹配到的params参数替换到url路径上，未匹配到的参数拼接到url参数上，比如以下调用：

```js
// 使用方式
this.$api.getUser.restful({
  // 与axios配置一致
  params: {
    id: 1,
    age: 18
  }
}).then((resp) => {
  console.log(resp)
}).catch(err => {
  console.log(err)
}).finally(() => {
  console.log('done')
})
```

最终发起的请求路径为：/api/v1/getUser/1?age=18，以满足后端接口通过路径来接收参数。

### 语义化请求

```js
// Get请求
this.$api.get({
  // 与axios配置一致
  url: '/api/v2/basic/data',
  params: {
    key: 's_sys_menu_list',
    page_id: 90,
    user_id:0
  }
}).then(resp => {
  console.log(resp)
}).catch(err=>{
  console.log(err)
}).finally(() => {
  console.log('done')
})

// Post请求
this.$api.post({}).then().catch().finally()
// Delete请求
this.$api.delete({}).then().catch().finally()
// Put请求
this.$api.put({}).then().catch().finally()
```

### 链式请求

> 当一个接口需要另一个接口的返回值时，则链式请求就可以派上用场，使用方式如下：

```js
this.$api.queryData({
  params: {
    key: 'select_sys_menu_list',
    page_id: 90,
    user_id: 0
  }
}).then(resp => {
  // resp即第一个接口返回的结果
  return this.$api.pagingData({
    params: {
      key: 'i_s_sys_log',
    }
  })
}).then(resp => {
  // resp即第二个接口返回的结果
  return this.$api.add({
    data: {
      menu:resp.data.data,
      lcontent: '页面访问量'
    }
  })
}).then(resp => {
  console.log(resp)
})
```

### 并发请求

```js
const request1 = () => {
  return this.$api.add({
    params: {
      key: 'i_s_sys_log'
    },
    data: {
      lcontent: '页面访问量'
    }
  })
}
const request2 = () => {
  return this.$api.queryData({
    params: {
      key: 's_sys_menu_list',
      page_id: 90,
      user_id: 0
    }
  })
}

this.$api([request1, request2]).then(([resp1,resp2]) => {
  // 多个请求都完成时，才会调用then的回调
  // resp1即request1的响应结果，resp2即request2的响应结果，顺序与传入的请求顺序保持一致
  console.log(resp1)
  console.log(resp2)
})
```

### 取消请求

```js
// 取消所有发起的请求
this.$api.cancel()

//取消指定的请求
this.$api.get({
  name:'s_sys_user_list',
  ...
}
}).then()
//发起请求的时候，指定name属性，取消请求的时候，就用name属性值来取消请求
this.$api.cancel('s_sys_user_list')

//第二个参数作为提示信息显示在控制台
this.$api.cancel('s_sys_user_list','取消了用户接口的请求')
```

### 上传文件

```js
const formData = new FormData()
formData.append('userfile', fileInputElement.files[0])
this.$api({
  // 与axios配置一致，会合并全局配置参数globalAxiosOptions
  method: 'post',
  url: '/api/v1/file/upload',
  // 请求体方式传参
  data: formData
}).then(resp => {
  // 请求成功，执行then的回调
  console.log(resp)
}).catch(err => {
  // 请求发生异常时，你可以在catch的回调里处理
  console.log(err)
}).finally(() => {
  // 无论请求是否成功，都会执行finally的回调
  console.log('done')
})
```

## token机制

> 实现思路：在注册插件时，注册请求拦截器和响应异常拦截器，在请求拦截器里给请求头设置token，在响应异常拦截器里处理token过期时的逻辑

```js
import $api from 'vue-x-axios'

let apiConfig = {
  // 请求拦截器
  requestIntercept (config) {
    config.headers['Authorization'] = `Bearer token值`
    return config
  },
  // 响应异常拦截器
  responseErrorIntercept (error) {
    if (error.response.status === 401) {
      // token过期，自动跳到登录路由
      // router.push({ name: 'login' }) //如，跳转到登录页
    }
  }
}
Vue.use($api, apiConfig)
```

## host配置

> 实现思路：在注册插件时，传入路由实例对象与host配置即可。

```js
// 路由实例
import router from '@/router'
import $api from 'vue-x-axios'

let apiConfig = {
  hosts:  [{
    url: 'https://some-domain.com/api/',
    routeKeys: ['路由名称（在我们的系统中，使用菜单ID来作为路由名称，配菜单ID即可）']
  }],
  router
}
Vue.use($api, apiConfig)
```

则可实现效果：在命中的模块中，如果发起的接口请求没有指定完整的url地址，则会使用hosts中指定url来作为请求的目标主机。

## 业务辅助方法

> 在vue-x-axios基础之上封装了一层业务辅助类，方便请求线上文件进行接口注册，以及内置好token机制，以减少使用者的初始化工作。

1. 执行npm install vue-x-axios --save，安装好vue-x-axios包；

2. 在入口main.js文件里通过apiHelper进行初始化，使用方式如：

```js
// 异步请求插件-业务辅助方法
import { apiHelper } from 'vue-x-axios'

apiHelper.register({
  url: '/web/config/system_config.json'
}).then(() => {
  new Vue({
    template: '<App/>',
    components: { App }
  }).$mount('#app')
})
```

在system_config.json文件中，可对baseURL、hosts、api进行配置，如：
```js
{
  "baseURL": "https://some-domain.com", // 默认为当前站点，当前后端分离部署时，可通过设置baseURL来设置目标接口地址，PS：请确认，后端接口支持跨域请求
  "hosts": [{
    "url": "https://some-domain.com/api/",
    "routeKeys": ["路由名称（在系统中，如菜单ID来作为路由名称，配菜单ID即可）"]
  }],
  "api": [{
    "name": "基础数据接口V1版本",
    "method": "queryData",
    "url": "/api/v1/queryData",
    "type": "get"
  }]
}
```
如果本地开发未设置请求代理，请传入线上文件完整url地址，如：https://some-domain.com/web/config/system_config.json , 这样，即完成了线上文件中的接口注册，在业务模块中即可发起线上文件中配置的接口请求了，具体请求方式请参考[配置型接口请求](#配置型接口请求)。

如果要禁用或自定义辅助方法内的请求拦截器、响应拦截器、响应异常拦截器，则传入null（禁用）或者自定义逻辑函数，如禁用代码如下：

```js
import { apiHelper } from 'vue-x-axios'

apiHelper.register({
  url: '/web/config/system_config.json',
  requestIntercept: null,
  responseSuccIntercept: null,
  responseErrorIntercept: null
}).then(() => {
  new Vue({
    template: '<App/>',
    components: { App }
  }).$mount('#app')
})
```

自定义函数逻辑，如下：

```js
import { apiHelper } from 'vue-x-axios'

apiHelper.register({
  url: '/web/config/system_config.json', // 请求线上接口配置文件
  // 请求拦截器
  requestIntercept(config){
    // 自定义处理逻辑
    return config
  },
  // 响应拦截器
  responseSuccIntercept(resp){
    // 自定义处理逻辑
    return resp
  },
  // 响应异常拦截器
  responseErrorIntercept(err){
    // 自定义处理逻辑
  }
}).then(() => {
  new Vue({
    template: '<App/>',
    components: { App }
  }).$mount('#app')
})
```

说明：因为内部请求线上文件的动作是异步的，所以后续的操作应该在apiHelper.register的then回调中去处理，比如Vue根实例的初始化。

## 附：官方axios完整配置参考

```js
{
  // `url` 是用于请求的服务器 URL
  url: '/user',

  // `method` 是创建请求时使用的方法
  method: 'get', // 默认是 get

  // `baseURL` 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。
  // 它可以通过设置一个 `baseURL` 便于为 axios 实例的方法传递相对 URL
  baseURL: 'https://some-domain.com/api/',

  // `transformRequest` 允许在向服务器发送前，修改请求数据
  // 只能用在 'PUT', 'POST' 和 'PATCH' 这几个请求方法
  // 后面数组中的函数必须返回一个字符串，或 ArrayBuffer，或 Stream
  transformRequest: [function (data) {
    // 对 data 进行任意转换处理

    return data;
  }],

  // `transformResponse` 在传递给 then/catch 前，允许修改响应数据
  transformResponse: [function (data) {
    // 对 data 进行任意转换处理

    return data;
  }],

  // `headers` 是即将被发送的自定义请求头
  headers: {'X-Requested-With': 'XMLHttpRequest'},

  // `params` 是即将与请求一起发送的 URL 参数
  // 必须是一个无格式对象(plain object)或 URLSearchParams 对象
  params: {
    ID: 12345
  },

  // `paramsSerializer` 是一个负责 `params` 序列化的函数
  // (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
  paramsSerializer: function(params) {
    return Qs.stringify(params, {arrayFormat: 'brackets'})
  },

  // `data` 是作为请求主体被发送的数据
  // 只适用于这些请求方法 'PUT', 'POST', 和 'PATCH'
  // 在没有设置 `transformRequest` 时，必须是以下类型之一：
  // - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
  // - 浏览器专属：FormData, File, Blob
  // - Node 专属： Stream
  data: {
    firstName: 'Fred'
  },

  // `timeout` 指定请求超时的毫秒数(0 表示无超时时间)
  // 如果请求话费了超过 `timeout` 的时间，请求将被中断
  timeout: 1000,

  // `withCredentials` 表示跨域请求时是否需要使用凭证
  withCredentials: false, // 默认的

  // `adapter` 允许自定义处理请求，以使测试更轻松
  // 返回一个 promise 并应用一个有效的响应 (查阅 [response docs](#response-api)).
  adapter: function (config) {
    /* ... */
  },

  // `auth` 表示应该使用 HTTP 基础验证，并提供凭据
  // 这将设置一个 `Authorization` 头，覆写掉现有的任意使用 `headers` 设置的自定义 `Authorization`头
  auth: {
    username: 'janedoe',
    password: 's00pers3cret'
  },

  // `responseType` 表示服务器响应的数据类型，可以是 'arraybuffer', 'blob', 'document', 'json', 'text', 'stream'
  responseType: 'json', // 默认的

  // `xsrfCookieName` 是用作 xsrf token 的值的cookie的名称
  xsrfCookieName: 'XSRF-TOKEN', // default

  // `xsrfHeaderName` 是承载 xsrf token 的值的 HTTP 头的名称
  xsrfHeaderName: 'X-XSRF-TOKEN', // 默认的

  // `onUploadProgress` 允许为上传处理进度事件
  onUploadProgress: function (progressEvent) {
    // 对原生进度事件的处理
  },

  // `onDownloadProgress` 允许为下载处理进度事件
  onDownloadProgress: function (progressEvent) {
    // 对原生进度事件的处理
  },

  // `maxContentLength` 定义允许的响应内容的最大尺寸
  maxContentLength: 2000,

  // `validateStatus` 定义对于给定的HTTP 响应状态码是 resolve 或 reject  promise 。如果 `validateStatus` 返回 `true` (或者设置为 `null` 或 `undefined`)，promise 将被 resolve; 否则，promise 将被 rejecte
  validateStatus: function (status) {
    return status >= 200 && status < 300; // 默认的
  },

  // `maxRedirects` 定义在 node.js 中 follow 的最大重定向数目
  // 如果设置为0，将不会 follow 任何重定向
  maxRedirects: 5, // 默认的

  // `httpAgent` 和 `httpsAgent` 分别在 node.js 中用于定义在执行 http 和 https 时使用的自定义代理。允许像这样配置选项：
  // `keepAlive` 默认没有启用
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),

  // 'proxy' 定义代理服务器的主机名称和端口
  // `auth` 表示 HTTP 基础验证应当用于连接代理，并提供凭据
  // 这将会设置一个 `Proxy-Authorization` 头，覆写掉已有的通过使用 `header` 设置的自定义 `Proxy-Authorization` 头。
  proxy: {
    host: '127.0.0.1',
    port: 9000,
    auth: : {
      username: 'mikeymike',
      password: 'rapunz3l'
    }
  },

  // `cancelToken` 指定用于取消请求的 cancel token
  // （查看后面的 Cancellation 这节了解更多）
  cancelToken: new CancelToken(function (cancel) {
  })
}
```

## 更新日志
- 2.0.5
新增 restful型请求
- 2.0.0
调整 业务辅助方法逻辑及核心方法
- 1.0.0
调整 业务辅助方法逻辑
- 0.0.2
调整 文档完善
- 0.0.1
新增 版本发布