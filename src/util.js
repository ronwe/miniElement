
let uuidPreix = 0;
export function uuid() {
	uuidPreix++;
	if (uuidPreix >= 1000) {
		uuidPreix = 0;
	}
	let id = (+new Date).toString(36);
	return ('00' + uuidPreix).slice(-3) + id;

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
