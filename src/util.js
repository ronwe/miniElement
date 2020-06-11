import { 
  isProxySymbol, 
  isMethodSymbol, 
  isSlotSymbol
} from './symbols.js';

//思路from  https://github.com/dylang/shortid
let REDUCE_TIME = +new Date - Math.ceil(Math.random() * 1000); 
let uuidPrevSeconds;
let uuidPrevHash;
let uuidPrefix = 0;
let uuidPrefixMax = Math.pow(62, 3);

let BASE_CHARS = Array.from('0123456789abcdefghigklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ');
let BASE_LEN = BASE_CHARS.length;

function base62(qutient) {
  let result = [];
  while (qutient) {
    let mod = qutient % BASE_LEN;
    qutient = (qutient - mod) / BASE_LEN;
    result.push(BASE_CHARS[mod]);
  }
  return result.join('');
}

export function uuid() {
  let seconds = Math.floor(((+new Date) - REDUCE_TIME)); 
  let id;
  if (seconds === uuidPrevSeconds) {
    uuidPrefix++;
    if (uuidPrefix >= uuidPrefixMax) {
      uuidPrefix = 0;
    }
    id = uuidPrevHash;
  } else {
    id = base62(seconds);
    uuidPrevHash = id;
    uuidPrevSeconds = seconds;
  }
  return ('000' + base62(uuidPrefix)).slice(-3) + id;
}

let reduceEvent;
export function debounce(cb, delay = 0) {
  return function(...args) {
    if (reduceEvent) {
      clearTimeout(reduceEvent);
    }
    reduceEvent = setTimeout(() => cb.apply(null, args) , delay);
  }
}

export var Detect = {
  isMethod: arg => true === arg[isMethodSymbol], 
  isSlot: arg => true === arg[isSlotSymbol], 
	isSymbol: arg => 'symbol' === typeof arg,
  isFunction: arg => 'function' === typeof arg,
  isNumber: arg => !isNaN(arg * 1),
  isArray: arg => Array.isArray(arg)
}
