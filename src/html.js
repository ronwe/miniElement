import { uuid } from './util.js';
import { proxySymbol} from './data.js';


/*
* 支持哪些事件绑定
*/
const EventNames = {
	'click': 'click'
};

let fnSymbol = Symbol('bid');

function setBindedIdByFn(bindedEvents, fn) {
	let id = uuid();
	fn[fnSymbol] = id;
	bindedEvents[id] = fn;
	return id;
}
function getBindedIdByFn(fn) {
	return  fn[fnSymbol];
}

export function parseTag(raw, index) {
	let str = raw[index];
	//从末尾查找最近空格@ 
	let tagSymbol = ' @';
	let tagStrIndex = str.lastIndexOf(tagSymbol);
	let found = false;
	if (tagStrIndex > -1) {
		let tagDetector = str.slice(tagStrIndex);
		//去掉引号内部分
		tagDetector = tagDetector.replace(/('|").*\1/,'');
		if (tagDetector.indexOf('>') === -1) {
			let tag = str.slice(tagStrIndex + tagSymbol.length).trim();
			return [str.slice(0, tagStrIndex), tag];
		}
	}	
}

/*
*
*/
export function processTag(orginTagContent, value, bindedEvents) {
	let type = orginTagContent.slice(-1);
	let tagContent = orginTagContent.slice(0, -1).trim();
	let tagDecorator = tagContent.match(/^(\w+)\((.*)\)$/);
	let tagSymbol;
	let tagDecoration; 
	if (tagDecorator) {
		tagSymbol = tagDecorator[1];
		tagDecoration = tagDecorator[2];
	} else {
		tagSymbol = tagContent;
	}
	
	switch (type) {
		case '=':
			//绑定事件
			if (tagSymbol in  EventNames) {
					let bindId = getBindedIdByFn(value);
					if (!bindId) {
						bindId = setBindedIdByFn(bindedEvents, value); 
					}
					return [tagSymbol, tagDecoration,  bindId]
			}
			break;
	}
}

/*
* 绑定事件委托
*/
export function delegateEvents(root, eventsStack, options) {
	root.addEventListener('click', function(evt) {
		let element = evt.target;
		let type = evt.type;
		let bindedId = element.getAttribute('_bind_' + type);
		if (!bindedId) {
			return;
		}
	
		let [id, decoration] = bindedId.split('.');
		if (!id || !eventsStack[id]) {
			return;
		}
		eventsStack[id].call(element, evt, options);
	})

}

export function htmlEscape(str) {
  if (true === str[proxySymbol]) {
    return '';
  } 
  if ('object' === typeof str) {
    return `<pre>${JSON.stringify(str, null, 2)}</pre>`;
  }

	return isNaN(str)? str.toString()
		.replace(/&/g, '&amp;') 
		.replace(/>/g, '&gt;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/`/g, '&#96;') 
		: str.toString();
}

