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
parseProxyValue.equal = function(obj, valueMap, otherValue) {
	return bindAttrMap(obj, valueMap, otherValue);
}
parseProxyValue.raw = function(obj) {
  return parseProxyValue(obj[getRawSymbol]);
}

function bindAttrMap(obj, valueMap, otherValue) {
	return () => {
		return valueMap[parseProxyValue(obj)] || otherValue;
	}
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
let proxyPrototype = {
  toString(radix) {
    return this.value.toString(radix);
  },
  replace(...args) {
    return this.value.replace.apply(this.value, args.map(arg => parseProxyValue(arg)));
  },
  [isDataSymbol]: true,
  [Symbol.toPrimitive](hint) {
    return this.value;
  }
};


function readOnlyProxy(data, dataMap, {receiver} = {}) {
  if (typeof data !== 'object') {
    if (printAble(data)) {
      let affects = getDataRelection(dataMap);
      let ret = Object.assign({
        affects,
				parent: receiver,
        value: data,
        [getRawSymbol]: data
      }, proxyPrototype);
      return ret;
    } else {
      return data;
    }
  }
  return new Proxy(data, {
    get: (target, prop) => {
      console.log('>>>', target, prop);  
    }
  });
}
function proxyData(data, observers, dataMap, {isArray, receiver, prop} = {}) {
  if (typeof data !== 'object') {
    if (!isArray && printAble(data) ){
      let affects = getDataRelection(dataMap);
      let ret = Object.assign({
        affects,
				parent: receiver,
				prop: prop,
        value: data,
        [getRawSymbol]: data
      }, proxyPrototype);
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
      //console.log('$get', prop, target);
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
      if (true  === target[isBlankSymbol] && ['map',  'every', 'some', 'filter', 'indexOf', 'lastIndexOf'].includes(prop)) {
        return function() {};
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
          //return proxyData(target[prop], observers, dataMap, {isArray : Detect.isArray(target), receiver , prop});
          return proxyData(target[prop], observers, dataMap, {isArray : false, receiver , prop});
        }
      } else if (prop in target) {
        if (Detect.isArray(target) && 'map' === prop) {
          return function(cbk) {
            let hackedFn = function(opts) {
              let targetLen = target.length;
              let mapResults = [];
              let j = 0;
              let proxyObj = proxyData(target, observers, dataMap, {isArray: true, receiver , prop});
              for (let i = 0; i < targetLen; i++) {
                if (undefined !== target[i] && null !== target[i]) {
                  mapResults.push(cbk(proxyObj[i], readOnlyProxy(j, dataMap, {receiver: target[i]})));
                  j++;
                }
              }
              return mapResults;
            }
            hackedFn[isHackSymbol] = true;
            hackedFn.affects  = getRelateParent(dataMap, target);
            return hackedFn;
          }
        } else if (Detect.isArray(target) && Detect.isFunction(target[prop])) {
          if (['splice','push','pop','shift','unshift'].includes(prop)) {
            return function(...args) {
              let keepChilds;
              let oldValue = target.slice();
              target[prop].apply(target, args.map(arg => parseProxyValue(arg)));
              let value = target.slice();
              let pushNew = 0;
              if (['push', 'pop'].includes(prop)) {
                pushNew = value.length - oldValue.length;
              } else  {
                let offset, removeCount, insertArray;
                if ('splice' === prop ) {
                  [offset, removeCount, ...insertArray] = args;
                } else if ('shift' === prop) {
                  offset = 0;
                  removeCount = 1;
                } else if ('unshift' === prop) {
                  offset = 0;
                  removeCount = 0;
                  insertArray = [args];
                }
                //console.log('args', offset, removeCount, insertArray);
                keepChilds = [];
                let j = 0
                for (let i = 0 ;i < oldValue.length; i++ ) {
                  let inRelation = true;
                  if (i < offset || i >  offset + removeCount) {
                  } else if (i == offset + removeCount) {
                    j += insertArray? insertArray.length : 0;
                  } else {
                    inRelation = false;
                  }
                  if (inRelation) {
                    keepChilds.push([i, j]);
                    j++;
                  }
                }
                //console.log('keepChilds', keepChilds);
              }
              let dataId = [].concat(getRelateParent(dataMap, target));

              triggerObserver({target, prop, oldValue, value, pushNew , dataId, keepChilds});
              return target;
            }
          } else {
            return function(...args) {
              return target[prop].apply(target, args.map(arg => parseProxyValue(arg)));
            }
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
      //console.log('$set', target, prop, value);
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
            } else if (existsProp && Detect.isArray(target[prop])) {
              updateDataMap(target[prop]);
              dataId = [].concat(getRelateParent(dataMap, target[prop]));
            } else {
              dataId = [].concat(getRelateParent(dataMap, target));
            }
          }

          triggerObserver({target, prop, oldValue, value, pushNew, dataId});
        }
        if (Detect.isArray(target[prop]) && Detect.isArray(value)) {
          target[prop].splice(0, target[prop].length, ...value);
        } else {
          target[prop] = value;
        }
      }
      return true;
    },
    deleteProperty: (target, prop) => {
      console.log('delete...', target.toString(), prop);
      if (prop in target) {
        delete target[prop];
      }
      return true;

    }
  })


  function triggerObserver({target, prop, oldValue, value, pushNew, dataId, keepChilds}) {
      observers.forEach( observer => observer({
        prop, 
        newValue: value, 
        oldValue, 
        dataRoot: target,
        dataNew: pushNew,
        dataId: dataId.join(dataMarkerJoin),
        keepChilds
      }));
  }
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


