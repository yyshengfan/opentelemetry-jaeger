
const { initTrace, getTraceId } = require('./index');
const Koa = require("koa");
const app = new Koa();

initTrace({
    TRANCE_ENV: 'qa', 
    TRANCE_PROJECT_ENV: 'risk-test-1', 
    TRANCE_NAME: 'risk-components-control', 
    TRANCE_HOST: '10.110.223.231',
    TRANCE_PORT: 6832
});

// ctx表示一次对话的上下文（包括 HTTP 请求和 HTTP 回复）
app.use(ctx => {
  ctx.body = getTraceId()
})

// 监听3001端口
app.listen(3001, () => {
  console.log("server run on 127.0.0.1:3001");
});