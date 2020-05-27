import { 
  uuid, 
  Detect 
} from './util.js';

import { 
  dataMarkerJoin,
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
    get: (target, prop) => {
      //console.log('get', target, prop, target.hasOwnProperty(prop));
      if (isProxySymbol === prop) {
        return true;
      }

      if (target.hasOwnProperty(prop)) {
        if (dataMap) {
          updateDataMap(target);
          if ('object' === typeof target[prop]) {
            updateDataMap(target[prop], target);
          }
        }
        dataReflector = [target, prop];
        if (null !== globalReorder && isLeafNode(target[prop])) {
          globalReorder.push([dataMap, target, prop]);
        }
        if (target[prop] && true === target[prop][isProxySymbol])  {
          return target[prop];
        } else {
          return proxyData(target[prop], observer, dataMap, Detect.isArray(target));
        }
      } else if (prop in target) {
        if (Detect.isArray(target) && 'map' === prop) {
          return function(cbk) {
            let hackedFn = function(opts) {
              let targetLen = target.length;
              let mapResults = [];
              let j = 0;
              let proxyObj = proxyData(target, observer, dataMap, Detect.isArray(target));
              for (let i = 0; i < targetLen; i++) {
                if (undefined !== target[i] && null !== target[i]) {
                  mapResults.push(cbk(proxyObj[i], j));
                  j++;
                }
              }
              return mapResults;
            }
            hackedFn[isHackSymbol] = true;
            hackedFn.affects  = getRelateParent(dataMap, target);
            return hackedFn;
          }
        } else {
          return target[prop];
        }
      } else {
        //return proxyData({}, observer );
        return proxyData({} );
      }
    },
     set : (target, prop, value) => {
       //console.log('set', target, prop, value);
       if (value !== target[prop]) {
         if (observer) {
           let oldValue = target[prop];
           let existsProp = target.hasOwnProperty(prop);
           let dataId;
           let pushNew;
           if (dataMap) {
             if (Detect.isArray(target) ){
               if ('length' === prop ) { 
                pushNew = value - target.length;
               } else if (Detect.isNumber(prop) && !target.hasOwnProperty(prop)) {
                pushNew = prop  - ( target.length - 1);
               }
               //console.log('pushNew', pushNew);
             }
             if (existsProp && isLeafNode(target[prop])) {
               dataId = [prop].concat(getRelateParent(dataMap, target));
             } else {
               dataId = [].concat(getRelateParent(dataMap, target));
             }
           }

           observer({
             prop, 
             newValue: value, 
             oldValue, 
             dataRoot: target,
             dataNew: pushNew,
             dataId: dataId.join(dataMarkerJoin)
           });
          }
          target[prop] = value;
        }
        return true;
     },
     deleteProperty: (target, prop) => {
       console.log('delete...', target, prop);
       if (prop in target) {
         delete target[prop];
       }
       return true;

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


