import { 
  uuid, 
  Detect 
} from './util.js';

import { 
  isProxySymbol, 
  isDataSymbol, 
  isMethodSymbol,
  isHackSymbol
} from './symbols.js';

let dataReflector = [];

let globalReorder = null;


function getRelateParent(dataMap, obj) {
  let relations = [];
  let ref = dataMap.get(obj);
  relations.push(ref.dataId);
  while (ref && ref.parent) {
    ref = dataMap.get(ref.parent);
    relations.push(ref.dataId);
  }
  return relations;
}

export function startRecordAffects() {
  globalReorder = [];

}
export function stopRecordAffects() {
  let ret = globalReorder.map(record => {
    let [dataMap, obj, prop] = record;
    let relations = [prop];
    relations = relations.concat(getRelateParent(dataMap, obj));
    return relations;
  });
  globalReorder = null;
  return ret;
}
export function getDataRelection(dataMap) {
  let ret = dataReflector.slice();
  let [obj, prop] = ret;
  let relations = [prop];
  relations = relations.concat(getRelateParent(dataMap, obj));
  return relations;
};

/*
 * 根据类型判断是否到达叶子节点(能够打印的节点)
 * */
function isLeafNode(data) {
  if (typeof data !== 'object') {
    return data === null || ['undefined', 'string', 'boolean', 'number'].includes(typeof data);
  } else {
    return false;
  }
}
function proxyData(data, observer, dataMap, isArray ) {
  if (typeof data !== 'object') {
    if (!isArray && isLeafNode(data) ){
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
          if (null !== globalReorder && isLeafNode(obj[prop])) {
            globalReorder.push([dataMap, obj, prop]);
          }
          return proxyData(obj[prop], observer, dataMap, Detect.isArray(obj));
        } else if (prop in obj) {
          if (Detect.isArray(obj) && 'map' === prop) {
            return function(cbk) {
              let hackedFn = function(opts) {
                let objLen = obj.length;
                let mapResults = [];
                let j = 0;
                let proxyObj = proxyData(obj, observer, dataMap, Detect.isArray(obj));
                for (let i = 0; i < objLen; i++) {
                  if (undefined !== obj[i] && null !== obj[i]) {
                    mapResults.push(cbk(proxyObj[i], j));
                    j++;
                  }
                }
                return mapResults;
              }
              hackedFn[isHackSymbol] = true;
              hackedFn.affects  = getRelateParent(dataMap, obj);
              return hackedFn;
            }
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


