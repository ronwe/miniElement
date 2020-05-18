export var proxySymbol = Symbol('proxy');

function proxyData(data, observer) {
  if (typeof data !== 'object') {
    return data;
  }

  return new Proxy(data, {
     get: (obj, prop) => {
        if (proxySymbol === prop) {
          return true;
        }

        if (prop in obj) {
          return proxyData(obj[prop], observer);
        } else {
          return proxyData({}, observer);
        }
     },
     set : (obj, prop, value) => {
        //console.log(obj, prop, value);
        if (value !== obj[prop]) {
          if (observer) {
            observer(prop, value, obj[prop]);
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

  return proxyData(data, observer);
}

