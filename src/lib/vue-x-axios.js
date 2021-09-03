import Qs from 'qs'
import axios from 'axios'

let cachePool = {} // 缓存池
let CACHE_TIME = 60000 // 缓存时间，单位ms
const CancelToken = axios.CancelToken

let apiSignature = [] // 接口签名，用于判断重复接口

const defaultsAxiosOptions = {
  // `url` 是用于请求的服务器 URL
  // url: '/user',

  // `method` 是创建请求时使用的方法
  // method: 'get', // 默认是 get

  // `baseURL` 将自动加在 `url` 前面，除非 `url` 是一个绝对 URL。
  // 它可以通过设置一个 `baseURL` 便于为 axios 实例的方法传递相对 URL
  // baseURL: 'https://some-domain.com/api/',

  // `transformRequest` 允许在向服务器发送前，修改请求数据
  // 只能用在 'PUT', 'POST' 和 'PATCH' 这几个请求方法
  // 后面数组中的函数必须返回一个字符串，或 ArrayBuffer，或 Stream
  // transformRequest: [function (data, headers) {
  //   // 对 data 进行任意转换处理
  //   if (data && data.toString() === '[object FormData]') {
  //     return data
  //   }
  //   if (headers['Content-Type'] && headers['Content-Type'].indexOf('application/json') > -1) {
  //     return JSON.stringify(data)
  //   } else if (Array.isArray(data)) {
  //     return JSON.stringify(data)
  //   }
  //   else {
  //     return Qs.stringify(data)
  //   }
  // }],

  // `transformResponse` 在传递给 then/catch 前，允许修改响应数据
  // transformResponse: [function(data) {
  //     // 对 data 进行任意转换处理
  //     return data;
  // }],
  transformRequest: [
    data => Qs.stringify(data, { arrayFormat: 'repeat', skipNulls: true })
  ],

  // `headers` 是即将被发送的自定义请求头
  // headers: { 'X-Request-Module': window.location.href },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  // `params` 是即将与请求一起发送的 URL 参数
  // 必须是一个无格式对象(plain object)或 URLSearchParams 对象
  // params: {
  //     ID: 12345
  // },

  // `paramsSerializer` 是一个负责 `params` 序列化的函数
  // (e.g. https://www.npmjs.com/package/qs, http://api.jquery.com/jquery.param/)
  paramsSerializer: params => {
    return Qs.stringify(params, { arrayFormat: 'repeat', skipNulls: true })
  }

  // `data` 是作为请求主体被发送的数据
  // 只适用于这些请求方法 'PUT', 'POST', 和 'PATCH'
  // 在没有设置 `transformRequest` 时，必须是以下类型之一：
  // - string, plain object, ArrayBuffer, ArrayBufferView, URLSearchParams
  // - 浏览器专属：FormData, File, Blob
  // - Node 专属： Stream
  // data: {
  //     firstName: 'Fred'
  // },

  // `timeout` 指定请求超时的毫秒数(0 表示无超时时间)
  // 如果请求花费了超过 `timeout` 的时间，请求将被中断
  // timeout: 1000,

  // `withCredentials` 表示跨域请求时是否需要使用凭证
  // withCredentials: false, // 默认的

  // `adapter` 允许自定义处理请求，以使测试更轻松
  // 返回一个 promise 并应用一个有效的响应 (查阅 [response docs](#response-api)).
  // adapter: function(config) {
  //     /* ... */
  // },

  // `auth` 表示应该使用 HTTP 基础验证，并提供凭据
  // 这将设置一个 `Authorization` 头，覆写掉现有的任意使用 `headers` 设置的自定义 `Authorization`头
  // auth: {
  //     username: 'janedoe',
  //     password: 's00pers3cret'
  // },

  // `responseType` 表示服务器响应的数据类型，可以是 'arraybuffer', 'blob', 'document', 'json', 'text', 'stream'
  // responseType: 'json', // 默认的

  // `xsrfCookieName` 是用作 xsrf token 的值的cookie的名称
  // xsrfCookieName: 'XSRF-TOKEN', // default

  // `xsrfHeaderName` 是承载 xsrf token 的值的 HTTP 头的名称
  // xsrfHeaderName: 'X-XSRF-TOKEN', // 默认的

  // `onUploadProgress` 允许为上传处理进度事件
  // onUploadProgress: progressEvent=> {
  //     // 对原生进度事件的处理
  // },

  // `onDownloadProgress` 允许为下载处理进度事件
  // onDownloadProgress: progressEvent=> {
  //     // 对原生进度事件的处理
  // },

  // `maxContentLength` 定义允许的响应内容的最大尺寸
  // maxContentLength: 2000,

  // `validateStatus` 定义对于给定的HTTP 响应状态码是 resolve 或 reject  promise 。如果 `validateStatus` 返回 `true` (或者设置为 `null` 或 `undefined`)，promise 将被 resolve; 否则，promise 将被 reject
  // validateStatus: status=> {
  //     return status >= 200 && status < 300; // 默认的
  // },

  // `maxRedirects` 定义在 node.js 中 follow 的最大重定向数目
  // 如果设置为0，将不会 follow 任何重定向
  // maxRedirects: 5, // 默认的

  // `httpAgent` 和 `httpsAgent` 分别在 node.js 中用于定义在执行 http 和 https 时使用的自定义代理。允许像这样配置选项：
  // `keepAlive` 默认没有启用
  // httpAgent: new http.Agent({ keepAlive: true }),
  // httpsAgent: new https.Agent({ keepAlive: true }),

  // 'proxy' 定义代理服务器的主机名称和端口
  // `auth` 表示 HTTP 基础验证应当用于连接代理，并提供凭据
  // 这将会设置一个 `Proxy-Authorization` 头，覆写掉已有的通过使用 `header` 设置的自定义 `Proxy-Authorization` 头。
  // proxy: {
  //     host: '127.0.0.1',
  //     port: 9000,
  //     auth:: {
  //         username: 'mikeymike',
  //         password: 'rapunz3l'
  //     }
  // },

  // `cancelToken` 指定用于取消请求的 cancel token
  // （查看后面的 Cancellation 这节了解更多）
  // cancelToken: new CancelToken(function(cancel) {})
}

let api = {
  install: (
    Vue,
    {
      hosts,
      router,
      apiConfig,
      cacheTime,
      globalAxiosOptions,
      requestIntercept,
      responseSuccIntercept,
      responseErrorIntercept
    } = {}
  ) => {
    // http请求拦截器
    axios.interceptors.request.use(
      config => {
        const {
          url,
          method,
          data,
          params,
          cache,
          cacheTime: _cacheTime
        } = config
        if (cache) {
          const source = CancelToken.source()
          config.cancelToken = source.token
          // 去缓存池获取缓存数据
          const cacheKey = `${url}_${method}_${
            params ? JSON.stringify(params) : ''
          }_${data ? JSON.stringify(data) : ''}`
          const cacheData = cachePool[cacheKey]
          const expireTime = new Date().getTime() // 获取当前时间戳
          // 判断缓存池中是否存在已有数据，存在的话，再判断是否过期
          // 未过期 source.cancel会取消当前的请求 并将内容返回到拦截器的err中
          if (
            cacheData &&
            expireTime - cacheData.expire < (_cacheTime || CACHE_TIME)
          ) {
            source.cancel(cacheData)
          }
        }
        return requestIntercept ? requestIntercept(config) : config
      },
      err => {
        return Promise.reject(err)
      }
    )

    // http响应拦截器
    axios.interceptors.response.use(
      resp => {
        if (resp.status && resp.config && resp.headers && resp.request) {
          // 来自接口的响应
          const { name, cache, url, method, params, data } = resp.config
          delete $api.cancelStack[name]
          if (cache) {
            // 缓存数据 并将当前时间存入 方便之后判断是否过期
            const cacheData = {
              data: resp.data,
              expire: new Date().getTime()
            }
            const cacheKey = `${url}_${method}_${
              params ? JSON.stringify(params) : ''
            }_${data || ''}`
            cachePool[cacheKey] = cacheData
          }
          return responseSuccIntercept ? responseSuccIntercept(resp) : resp
        } else {
          // 来自缓存的响应
          return resp
        }
      },
      err => {
        return responseErrorIntercept
          ? responseErrorIntercept(err)
          : Promise.reject(err)
      }
    )

    // 发送请求
    const ajax = options => {
      options = Object.assign(
        {},
        options,
        {
          name: options['name'] || Math.random().toString(),
          cancelToken: new axios.CancelToken(c => {
            $api.cancelStack[options.name] = c
          })
        },
        options.method === 'delete' ? { transformRequest: null } : {}
      )
      let currentRoute = router && router.currentRoute
      // 扩展不同模块使用不同的baseUrl
      if (currentRoute && hosts) {
        let targetHost = hosts.find(host => {
          return host.routeKeys.find(routeKey => routeKey === currentRoute.name)
        })
        options.baseURL = (targetHost || {}).url || null
      }
      return new Promise((resolve, reject) => {
        axios(options)
          .then(resp => {
            resolve(resp)
          })
          .catch(err => {
            reject(err)
          })
      })
    }
    // 并发请求
    const batchAjax = requestArray => {
      return new Promise((resolve, reject) => {
        axios
          .all(requestArray.map(request => request()))
          .then(resp => {
            resolve(resp)
          })
          .catch(err => {
            reject(err)
          })
      })
    }

    globalAxiosOptions = Object.assign(
      {},
      defaultsAxiosOptions,
      globalAxiosOptions
    )

    const request = options => {
      return Array.isArray(options)
        ? batchAjax(options)
        : (() => {
            options = Object.assign({}, globalAxiosOptions, options)
            return ajax(options)
          })()
    }
    const requestWithAliases = (options, method = {}) => {
      options = Object.assign({}, globalAxiosOptions, options, method)
      return ajax(options)
    }
    // 注册配置类接口
    const registerMethod = apiConfig => {
      apiConfig.forEach(methodConfig => {
        const {
          url,
          data,
          type,
          name,
          method,
          params,
          cache,
          cacheTime: _cacheTime,
          ...rest
        } = methodConfig
        if (!method) {
          console.warn(
            `%c url: ${url}的接口注册未填写method属性，请调整！`,
            'font-size:2em'
          )
          return false
        }
        if ($api[methodConfig.method]) {
          console.warn(
            `%c 存在重名的接口方法(method: ${method})，请调整！`,
            'font-size:2em'
          )
          return false
        }
        if (process.env.NODE_ENV === 'development') {
          const signature = `${url}${type}${JSON.stringify(
            data
          )}${JSON.stringify(params)}${cache}`
          const tempSignature = apiSignature.find(
            item => item.signature === signature
          )
          if (tempSignature) {
            console.warn(`%c 存在重复的接口，请调整！`, 'font-size:2em')
            console.table([
              {
                name,
                method,
                url,
                type,
                data,
                params,
                cache
              },
              {
                name: tempSignature.name,
                method: tempSignature.method,
                url,
                type,
                data,
                params,
                cache
              }
            ])
          }
          apiSignature.push({
            name,
            method,
            signature
          })
        }
        $api[method] = options => {
          options && options.type && (options.method = options.type)
          options = Object.assign(
            {},
            {
              cache,
              cacheTime: _cacheTime,
              method: type || 'get',
              url,
              data,
              params,
              ...rest
            },
            options
          )
          return $api(options)
        }
        // 扩展url路径型参数请求
        $api[method].restful = options => {
          options && options.type && (options.method = options.type)
          options = Object.assign(
            {},
            {
              cache,
              cacheTime: _cacheTime,
              method: type || 'get',
              url,
              data,
              params,
              ...rest
            },
            options
          )
          let unMatchedParams = {}
          Object.entries(options.params || {}).forEach(entry => {
            let val = entry[1]
            let name = entry[0]
            var regex = new RegExp(`{${name}}`, 'g')
            if (regex.test(options.url)) {
              options.url = options.url.replace(regex, `${val}`)
            } else {
              unMatchedParams[name] = val
            }
          })
          options.params = unMatchedParams
          return $api(options)
        }
        // 清除缓存
        $api[method].clearCache = () => {
          const cacheKey = `${url}_${type || 'get'}`
          Object.keys(cachePool)
            .filter(key => key.indexOf(cacheKey) === 0)
            .forEach(key => delete cachePool[key])
        }
        $api[methodConfig.method].config = methodConfig
      })
      apiSignature = null
    }

    let $api = options => {
      return request(options)
    }
    apiConfig && registerMethod(apiConfig)
    $api.cancelStack = {}
    $api.cancel = (name, message) => {
      if (name && !$api.cancelStack[name]) {
        return
      }
      name
        ? $api.cancelStack[name](message)
        : Object.values($api.cancelStack).map(c => c(message))
    }
    // 初始化缓存时间，默认60s
    CACHE_TIME = cacheTime || 60000
    // 设置缓存时间(单位ms)
    $api.setCacheTime = time => (CACHE_TIME = time)
    // 清空缓存
    $api.clearCache = () => (cachePool = {})
    // 语义化请求
    $api.request = options => request(options)
    $api.get = options => {
      return requestWithAliases(options, { method: 'get' })
    }
    $api.delete = options => {
      return requestWithAliases(options, { method: 'delete' })
    }
    $api.post = options => {
      return requestWithAliases(options, { method: 'post' })
    }
    $api.put = options => {
      return requestWithAliases(options, { method: 'put' })
    }
    $api.postFile = options => {
      return requestWithAliases(options, {
        method: 'post',
        headers: { 'Content-Type': 'multipart/form-data' }
      })
    }
    $api.all = requestArray => {
      return batchAjax(requestArray)
    }
    // 添加全局方法
    Vue.$api = $api
    // 添加实例方法
    Vue.prototype.$api = $api
  }
}
export default api
