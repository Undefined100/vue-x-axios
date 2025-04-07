import Qs from 'qs'
import axios from 'axios'
import extend from 'extend'

let cachePool = {} // 缓存池
let CACHE_TIME = 60000 // 缓存时间，单位ms
const CancelToken = axios.CancelToken

let apiSignature = [] // 接口签名，用于判断重复接口

// 私有方法列表
const privateMethods = [
  'deleteMethod',
  'registerMethod',
  'cancelStack',
  'cancel',
  'setCacheTime',
  'clearCache',
  'request',
  'get',
  'delete',
  'post',
  'put',
  'postFile',
  'all'
]

const defaultsAxiosOptions = {
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  },
  transformRequest: [
    data => Qs.stringify(data, { arrayFormat: 'repeat', skipNulls: true })
  ],
  paramsSerializer: params => {
    return Qs.stringify(params, { arrayFormat: 'repeat', skipNulls: true })
  }
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
          const cacheKey = `${url}_${method}_${params ? JSON.stringify(params) : ''
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
            const cacheKey = `${url}_${method}_${params ? JSON.stringify(params) : ''
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
        !options.transformRequest && (delete options['transformRequest'])
        axios(options)
          .then(resolve)
          .catch(reject)
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
          options.headers = Object.assign({}, globalAxiosOptions.headers, options.headers) // 扩展请求头
          return ajax(options)
        })()
    }
    const requestWithAliases = (options, method = {}) => {
      options = Object.assign({}, globalAxiosOptions, options, method)
      return ajax(options)
    }

    /**
     * 扩展接口回退逻辑
     */
    const extendFallbackApi = async (options, restful = false, originalOption) => {
      try {
        return await $api({...options, errorNotice: false}) // 发起优先接口请求时，关闭提示
      } catch (error) {
        // fallbackApi配置的是接注册型接口方法名，并且需要移除优先接口的url信息，然后再发起请求
        const {fallbackApi, fallbackWhen, url, ...restOptions} = restful ? originalOption : options
        const responseStatus = error?.response?.status
        // 配置了回退接口生效条件，fallbackWhen配置的是优先接口的响应状态码数组，只有响应状态码在配置的数组中，才会触发回退接口的请求
        if (fallbackWhen) {
          if (fallbackWhen.includes(responseStatus)) {
            if (restful) {
              return await $api[options.fallbackApi].restful(restOptions)
            }
            return await $api[options.fallbackApi](restOptions)
          } else {
            // 回退接口生效条件匹配失败，直接返回优先接口的错误对象
            return Promise.reject(error)
          }
        }
        // 没有配置回退接口生效条件，则直接发起回退接口请求
        if (restful) {
          return await $api[options.fallbackApi].restful(restOptions)
        }
        return await $api[options.fallbackApi](restOptions)
      }
    }

    // 注册配置类接口
    const registerMethod = apiConfig => {
      apiConfig.forEach(methodConfig => {
        if (!methodConfig) {
          console.warn(
            `%c 接口注册有误，获取到的接口配置为undefined，请调整！`,
            'font-size:2em'
          )
          return false
        }
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
        if (privateMethods.includes(method)) {
          console.log(
            `%c 接口方法 ${method}与私有方法名列表[${privateMethods}]中的方法重名，请调整！`,
            'font-size: 2em'
          )
          return false
        }
        if ($api[method]) {
          console.warn(
            `%c 存在重名的接口方法(method: ${method})，请调整！`,
            'font-size:2em'
          )
          if (process.env.NODE_ENV === 'development') {
            Vue.$confirm2?.error?.(`存在重名的接口方法(method: ${method})，会导致业务接口请求错误问题，请务必调整！<br>如果是基座与微应用的场景，请参考<a target="_blank" href="http://172.18.166.139:31034/micro-app/constraint#%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9">文档</a>。`, '提示', {
              showClose: false,
              showCancelButton: false,
              showConfirmButton: false
            })
          }
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
            console.table && console.table([
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
            Vue.$confirm2?.error?.(`存在重复的接口：${url}，请调整！<br>如果是基座与微应用的场景，请参考<a target="_blank" href="http://172.18.166.139:31034/micro-app/constraint#%E6%B3%A8%E6%84%8F%E4%BA%8B%E9%A1%B9">文档</a>。`, '提示', {
              showClose: false,
              showCancelButton: false,
              showConfirmButton: false
            })
          }
          apiSignature.push({
            name,
            method,
            signature
          })
        }
        $api[method] = async (options) => {
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
          if (options.fallbackApi) {
            return await extendFallbackApi(options)
          }
          return await $api(options)
        }
        // 扩展url路径型参数请求
        $api[method].restful = async options => {
          const originalParams = extend(true, {}, options?.params) // 原始params参数
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
          let unMatchedParams = {
            ...options.restfulParams // 路径参数与url参数共存
          }
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
          if (options.fallbackApi) {
            return await extendFallbackApi(options, true, {...options, params: originalParams})
          }
          return await $api(options)
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
      apiSignature = []
    }

    let $api = options => request(options)
    apiConfig && registerMethod(apiConfig)
    $api.registerMethod = registerMethod
    $api.deleteMethod = methods => {
      if (methods === undefined) {
        // 删除全部配置型接口
        Object.keys($api).forEach(m => {
          // 排除掉私有方法
          !privateMethods.includes(m) && delete $api[m]
        })
      } else if (Array.isArray(methods)) {
        // 删除指定方法名的配置型接口
        methods.forEach(m => {
          delete $api[m]
        })
      }
    }
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

    if (Vue.version.startsWith('3')) {
      // 添加全局方法
      window.$api = $api
      // 添加实例方法
      Vue.config.globalProperties.$api = $api
    } else {
      // 添加全局方法
      Vue.$api = $api
      // 添加实例方法
      Vue.prototype.$api = $api
    }
  }
}
export default api
