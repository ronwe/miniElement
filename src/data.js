import { uuid } from './util.js';

export var isProxySymbol = Symbol('proxy');
export var isDataSymbol = Symbol('data');



let dataReflector = [];
export function getDataRelection(dataMap) {
  let ret = dataReflector.slice();
  let [obj, prop] = ret;
  let relations = [prop];
  let ref = dataMap.get(obj);
  relations.push(ref.dataId);
  while(ref && ref.parent) {
    ref = dataMap.get(ref.parent);
    relations.push(ref.dataId);
  }
  return relations;
};

function proxyData(data, observer, dataMap, isArray ) {
  if (typeof data !== 'object') {
    if (!isArray && (data === null || ['undefined', 'string', 'boolean', 'number'].includes(typeof data)) ) {
      let affects = getDataRelection(dataMap);
      let ret = {
        value: data,
        affects,
				[Symbol.toPrimitive](hint) {
					return this.value;
				}
      };
      ret[isDataSymbol] = true;
      return ret;
    } else {
      return data;
    }
  }

  //建立节点标识和关系
  function updateDataMap(obj, parent) {
    if (!dataMap.get(obj)) {
      let dataId = uuid();
      dataMap.set(obj, {dataId, parent});
    }
  }

  return new Proxy(data, {
     get: (obj, prop) => {
        if (isProxySymbol === prop) {
          return true;
        }
       
        if (obj.hasOwnProperty(prop)) {
          if (dataMap) {
            updateDataMap(obj);
            if ('object' === typeof obj[prop]) {
              updateDataMap(obj[prop], obj);
            }
          }
          dataReflector = [obj, prop];
          return proxyData(obj[prop], observer, dataMap, Array.isArray(obj));
        } else if (prop in obj) {
          if (Array.isArray(obj) && 'map' === prop)) {
            updateDataMap(obj);
          } else {
            return obj[prop];
          }
        } else {
          //return proxyData({}, observer );
          return proxyData({} );
        }
     },
     set : (obj, prop, value) => {
        //console.log(obj, prop, value);
        if (value !== obj[prop]) {
          if (observer) {
            observer({
              prop, 
              newValue: value, 
              oldValue: obj[prop], 
              dataRoot: obj,
              dataId: dataMap && dataMap.get(obj)
           });
          }
          obj[prop] = value;
        }
        return true;
     },
     deleteProperty: () => {

     }
  })
}
/*
* 包装数据，作用两点：
* 1 屏蔽节点缺失异常, 中间节点类型错误不处理
* 2 绑定数据变动observe
*/
export function wrapperData (data, observer) {
  if (!data) {
    return;
  }
  return proxyData(data, observer,  new Map());
}


