<template>
  <div id="app">
    <input type="file" name="file" ref="file">
    <button @click="upload">上传</button>
  </div>
</template>
<script>
export default {
  name: 'app',
  methods: {
    upload () {
      this.$api({
        method: 'post',
        // 与axios配置一致，会合并全局配置参数globalAxiosOptions
        url: '/api/v1/file/upload',
        // 请求体方式传参
        data: { a: '1', b: 2 }
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
      // 文件上传，将数据装填在FormData中
      // const formData = new FormData()
      // formData.append('userfile', this.$refs.file.files[0])
      // this.$api({
      //   method: 'post',
      //   // 与axios配置一致，会合并全局配置参数globalAxiosOptions
      //   url: '/api/v1/file/upload',
      //   // 请求体方式传参
      //   data: formData
      // }).then(resp => {
      //   // 请求成功，执行then的回调
      //   console.log(resp)
      // }).catch(err => {
      //   // 请求发生异常时，你可以在catch的回调里处理
      //   console.log(err)
      // }).finally(() => {
      //   // 无论请求是否成功，都会执行finally的回调
      //   console.log('done')
      // })
    }
  }
}
</script>
<style>
#app {
  font-family: 'Avenir', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}

</style>
