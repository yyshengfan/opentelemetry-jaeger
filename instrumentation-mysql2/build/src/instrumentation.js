"use strict";
/*
 * Copyright The OpenTelemetry Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MySQL2Instrumentation = void 0;
const api = require("@opentelemetry/api");
const instrumentation_1 = require("@opentelemetry/instrumentation");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const utils_1 = require("./utils");
const version_1 = require("./version");
class MySQL2Instrumentation extends instrumentation_1.InstrumentationBase {
    constructor(config) {
        super('@opentelemetry/instrumentation-mysql2', version_1.VERSION, config);
    }
    init() {
        return [
            new instrumentation_1.InstrumentationNodeModuleDefinition('mysql2', ['>= 1.4.2 < 3.0'], (moduleExports, moduleVersion) => {
                api.diag.debug(`Patching mysql@${moduleVersion}`);
                const ConnectionPrototype = moduleExports.Connection.prototype;
                api.diag.debug('Patching Connection.prototype.query');
                if (instrumentation_1.isWrapped(ConnectionPrototype.query)) {
                    this._unwrap(ConnectionPrototype, 'query');
                }
                this._wrap(ConnectionPrototype, 'query', this._patchQuery(moduleExports.format));
                if (instrumentation_1.isWrapped(ConnectionPrototype.execute)) {
                    this._unwrap(ConnectionPrototype, 'execute');
                }
                this._wrap(ConnectionPrototype, 'execute', this._patchQuery(moduleExports.format));
                return moduleExports;
            }, (moduleExports) => {
                if (moduleExports === undefined)
                    return;
                const ConnectionPrototype = moduleExports.Connection.prototype;
                this._unwrap(ConnectionPrototype, 'query');
                this._unwrap(ConnectionPrototype, 'execute');
            }),
        ];
    }
    _patchQuery(format) {
        return (originalQuery) => {
            const thisPlugin = this;
            api.diag.debug('MySQL2Instrumentation: patched mysql query/execute');
            return function query(query, _valuesOrCallback, _callback) {
                let values;
                if (Array.isArray(_valuesOrCallback)) {
                    values = _valuesOrCallback;
                }
                else if (arguments[2]) {
                    values = [_valuesOrCallback];
                }
                const span = thisPlugin.tracer.startSpan(utils_1.getSpanName(query), {
                    kind: api.SpanKind.CLIENT,
                    // attributes: Object.assign(Object.assign(Object.assign({}, MySQL2Instrumentation.COMMON_ATTRIBUTES), utils_1.getConnectionAttributes(this.config)), { [semantic_conventions_1.SemanticAttributes.DB_STATEMENT]: utils_1.getDbStatement(query, format, values) }),
                    attributes: Object.assign(Object.assign(Object.assign({}, MySQL2Instrumentation.COMMON_ATTRIBUTES), utils_1.getConnectionAttributes(this.config)), { [semantic_conventions_1.SemanticAttributes.DB_STATEMENT]: 'mysql2_trace' }),
                });
                const endSpan = utils_1.once((err, results) => {
                    if (err) {
                        span.setStatus({
                            code: api.SpanStatusCode.ERROR,
                            message: err.message,
                        });
                    }
                    else {
                        const config = thisPlugin._config;
                        if (typeof config.responseHook === 'function') {
                            instrumentation_1.safeExecuteInTheMiddle(() => {
                                config.responseHook(span, { queryResults: results });
                            }, err => {
                                if (err) {
                                    thisPlugin._diag.warn('Failed executing responseHook', err);
                                }
                            }, true);
                        }
                    }
                    span.end();
                });
                if (arguments.length === 1) {
                    if (typeof query.onResult === 'function') {
                        thisPlugin._wrap(query, 'onResult', thisPlugin._patchCallbackQuery(endSpan));
                    }
                    const streamableQuery = originalQuery.apply(this, arguments);
                    // `end` in mysql behaves similarly to `result` in mysql2.
                    streamableQuery
                        .once('error', err => {
                        endSpan(err);
                    })
                        .once('result', results => {
                        endSpan(undefined, results);
                    });
                    return streamableQuery;
                }
                if (typeof arguments[1] === 'function') {
                    thisPlugin._wrap(arguments, 1, thisPlugin._patchCallbackQuery(endSpan));
                }
                else if (typeof arguments[2] === 'function') {
                    thisPlugin._wrap(arguments, 2, thisPlugin._patchCallbackQuery(endSpan));
                }
                return originalQuery.apply(this, arguments);
            };
        };
    }
    _patchCallbackQuery(endSpan) {
        return (originalCallback) => {
            return function (err, results, fields) {
                endSpan(err, results);
                return originalCallback(...arguments);
            };
        };
    }
}
exports.MySQL2Instrumentation = MySQL2Instrumentation;
MySQL2Instrumentation.COMMON_ATTRIBUTES = {
    [semantic_conventions_1.SemanticAttributes.DB_SYSTEM]: semantic_conventions_1.DbSystemValues.MYSQL,
};
//# sourceMappingURL=instrumentation.js.map