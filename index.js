const api = require("@opentelemetry/api");
const { registerInstrumentations } = require("@opentelemetry/instrumentation");
const { NodeTracerProvider } = require("@opentelemetry/sdk-trace-node");
const { JaegerExporter } = require("@opentelemetry/exporter-jaeger");
const { Resource } = require("@opentelemetry/resources");
const { SimpleSpanProcessor } = require("@opentelemetry/sdk-trace-base");
const { KoaInstrumentation } = require("@opentelemetry/instrumentation-koa");
const { HttpInstrumentation } = require("@opentelemetry/instrumentation-http");
const { GrpcInstrumentation } = require("@opentelemetry/instrumentation-grpc");
const { DnsInstrumentation } = require("@opentelemetry/instrumentation-dns");
const {
  IORedisInstrumentation,
} = require("@opentelemetry/instrumentation-ioredis");
const {
  MySQL2Instrumentation,
} = require("@opentelemetry/instrumentation-mysql2");
const {
  SemanticResourceAttributes,
} = require("@opentelemetry/semantic-conventions");
const {
  ExpressInstrumentation,
} = require("@opentelemetry/instrumentation-express");
const {
  FastifyInstrumentation,
} = require("@opentelemetry/instrumentation-fastify");
const {
  MongoDBInstrumentation,
} = require("@opentelemetry/instrumentation-mongodb");
const {
  WinstonInstrumentation,
} = require("@opentelemetry/instrumentation-winston");
const {
  AwsInstrumentation,
} = require("@opentelemetry/instrumentation-aws-sdk");

exports.default = {
  getTraceId: function() {
    const currentSpan = api.trace.getSpan(api.context.active());
    const { traceId } = currentSpan?.spanContext() || {};
    return traceId;
  },
  initTrace: function(params, instrumentationArr) {
    const {
      TRANCE_NAME,
      TRANCE_HOST,
      TRANCE_PORT,
      TRANCE_ENV,
      TRANCE_PROJECT_ENV,
    } = params;
    // 参数判断
    if (
      !TRANCE_NAME ||
      !TRANCE_HOST ||
      !TRANCE_PORT ||
      !TRANCE_ENV ||
      !TRANCE_PROJECT_ENV
    ) {
      throw new Error("init params error");
    }
    if (instrumentationArr && !isArray(instrumentationArr)) {
      throw new Error("instrumentationArr is not array");
    }
  
    // 初始化
    const provider = new NodeTracerProvider({
      resource: new Resource({
        [SemanticResourceAttributes.SERVICE_NAME]: TRANCE_NAME,
      }),
    });
  
    const exporter = new JaegerExporter({
      tags: [
        { key: "env", value: TRANCE_ENV },
        { key: "projectEnv", value: TRANCE_PROJECT_ENV },
      ],
      host: TRANCE_HOST, //测试
      port: TRANCE_PORT,
    });
  
    provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  
    const instrumentationsDefault = ["koa", "http", "mysql2", "ioredis", "grpc", "awssdk"];
    instrumentationArr = instrumentationArr || instrumentationsDefault;
  
    //["dns", "express", "koa", "fastify", "winston", "http", "mysql2", "ioredis", "mongodb", "grpc", "awssdk"]
    const instrumentations = [];
    instrumentationArr.forEach((item) => {
      switch (item) {
        case "dns": {
          instrumentations.push(new DnsInstrumentation());
          break;
        }
        case "express": {
          instrumentations.push(new ExpressInstrumentation());
          break;
        }
        case "koa": {
          instrumentations.push(new KoaInstrumentation());
          break;
        }
        case "fastify": {
          instrumentations.push(new FastifyInstrumentation());
          break;
        }
        case "winston": {
          instrumentations.push(new WinstonInstrumentation());
          break;
        }
        case "http": {
          instrumentations.push(new HttpInstrumentation());
          break;
        }
        case "mysql2": {
          instrumentations.push(new MySQL2Instrumentation());
          break;
        }
        case "ioredis": {
          instrumentations.push(new IORedisInstrumentation());
          break;
        }
        case "mongodb": {
          instrumentations.push(new MongoDBInstrumentation());
          break;
        }
        case "grpc": {
          instrumentations.push(new GrpcInstrumentation());
          break;
        }
        case "awssdk": {
          instrumentations.push(new AwsInstrumentation());
          break;
        }
      }
    });
  
    registerInstrumentations({
      instrumentations,
      tracerProvider: provider,
    });
  
    provider.register();
  
    return api.trace.getTracer("koa-example");
  }
}
