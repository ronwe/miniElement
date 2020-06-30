import { 
  uuid, 
  Detect 
} from './util.js';

import { 
  getRawSymbol,
  dataMarkerJoin,
	isBlankSymbol,
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



export var  getRealValue = parseProxyValue;

/*
* 获取真实值，因为逻辑运算不会触发ToPrimitive
*/
function parseProxyValue(obj) {
	if (obj[isBlankSymbol] === true) {
		return undefined;
	} else if (obj[isDataSymbol] && ('value' in obj)) {
		//强制读取下 更新节点标记
		obj.parent[obj.prop];

		return obj.value;
	} else {
		return obj;
	}
}
/*
* 用于一些属性绑定
*/
parseProxyValue.checked = function(obj, trueString) {
	return bindAttr(obj, trueString || 'checked');
}
parseProxyValue.raw = function(obj) {
  return parseProxyValue(obj[getRawSymbol]);
}

function bindAttr(obj, trueString, falseString = '') {
	return () => {
		return parseProxyValue(obj)? trueString : falseString;
	}
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
function printAble(data) {
  if (typeof data !== 'object') {
    return data === null || ['undefined', 'string', 'boolean', 'number'].includes(typeof data);
  } else {
    return false;
  }
}
function proxyData(data, observers, dataMap, {isArray, receiver, prop} = {}) {
  if (typeof data !== 'object') {
    if (!isArray && printAble(data) ){
      let affects = getDataRelection(dataMap);
      let ret = {
        affects,
				parent: receiver,
				prop: prop,
        value: data,
				[isDataSymbol]: true,
				[Symbol.toPrimitive](hint) {
					return this.value;
				}
      };
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
    get: (target, prop, receiver) => {
      //console.log('get', target, prop, target.hasOwnProperty(prop));
			if (Detect.isSymbol(prop)) {
				if (isProxySymbol === prop) {
					return true;
				}
				if (isBlankSymbol === prop && target.hasOwnProperty(isBlankSymbol)) {
					return true;
				}
        if (getRawSymbol === prop) {
          return target;
        }
				return;
			}

      if (target.hasOwnProperty(prop)) {
        if (dataMap) {
          updateDataMap(target);
          if ('object' === typeof target[prop]) {
            updateDataMap(target[prop], target);
          }
        }
        dataReflector = [target, prop];
        if (null !== globalReorder && printAble(target[prop])) {
          globalReorder.push([dataMap, target, prop]);
        }
        if (target[prop] && true === target[prop][isProxySymbol])  {
          return target[prop];
        } else {
          return proxyData(target[prop], observers, dataMap, {isArray : Detect.isArray(target), receiver , prop});
        }
      } else if (prop in target) {
        if (Detect.isArray(target) && 'map' === prop) {
          return function(cbk) {
            let hackedFn = function(opts) {
              let targetLen = target.length;
              let mapResults = [];
              let j = 0;
              let proxyObj = proxyData(target, observers, dataMap, {isArray: Detect.isArray(target), receiver , prop});
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
        //return proxyData({}, observers );
        return proxyData({[isBlankSymbol]: true} );
      }
    },
     set : (target, prop, value) => {
       //console.log('set', target, prop, value);
       if (value !== target[prop]) {
         if (observers) {
           let oldValue = target[prop];
           let existsProp = target.hasOwnProperty(prop);
           let dataId;
           let pushNew;
           if (dataMap) {
              updateDataMap(target);
             if (Detect.isArray(target) ){
               if ('length' === prop ) { 
                pushNew = value - target.length;
               } else if (Detect.isNumber(prop) && !target.hasOwnProperty(prop)) {
                pushNew = prop  - ( target.length - 1);
               }
               //console.log('pushNew', pushNew);
             }
             if (existsProp && printAble(target[prop])) {
               dataId = [prop].concat(getRelateParent(dataMap, target));
             } else {
               dataId = [].concat(getRelateParent(dataMap, target));
             }
           }

           observers.forEach( observer => observer({
             prop, 
             newValue: value, 
             oldValue, 
             dataRoot: target,
             dataNew: pushNew,
             dataId: dataId.join(dataMarkerJoin)
           }));
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
export function wrapperData (data, ...observers) {
  if (!data) {
    return;
  }
	
  return proxyData(data, observers,  new Map());
}


