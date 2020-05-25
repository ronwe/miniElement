import { isProxySymbol, isMethodSymbol } from './symbols.js';

//思路from  https://github.com/dylang/shortid
let REDUCE_TIME = +new Date - Math.ceil(Math.random() * 1000); 
let uuidPrevSeconds;
let uuidPrevHash;
let uuidPreix = 0;

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
		uuidPreix++;
		if (uuidPreix >= 4000) {
			uuidPreix = 0;
		}
    id = uuidPrevHash;
	} else {
	  id = base62(seconds);
    uuidPrevHash = id;
	  uuidPrevSeconds = seconds;
  }
	return ('0' + base62(uuidPreix)).slice(-2) + id;
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
  isFunction: arg => 'function' === typeof arg,
  isArray: arg => Array.isArray(arg)
}
