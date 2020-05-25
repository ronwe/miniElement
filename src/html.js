import { uuid } from './util.js';
import { isProxySymbol, isDataSymbol, fnSymbol } from './symbols.js';


/*
* 支持哪些事件绑定
*/
const EventNames = {
	'click': 'click'
};


function setBindedIdByFn(bindedEvents, fn) {
	let id = uuid();
	fn[fnSymbol] = id;
	bindedEvents[id] = fn;
	return id;
}
function getBindedIdByFn(fn) {
	return  fn[fnSymbol];
}

let dataMarkerBegin = '{%';
let dataMarkerEnd =  '%}';
let dataMarkerAny = '_';
let dataMarkerJoin = '-';

export function affectsToStr(affects) {
  return affects.join(dataMarkerJoin);
}
export function markDataIdInHtml(affects) {
  if (affects) {
    return `<!--${dataMarkerBegin}${affectsToStr(affects)}${dataMarkerEnd}-->`;
  }
}

/*
* 将数据id绑定到标签上
*/
export function processHtmlDataId(content) {
  content = content.replace(`${dataMarkerEnd}--><!--${dataMarkerBegin}`, dataMarkerAny);
  let reg = new RegExp(`<!--${dataMarkerBegin}([^\>]+)${dataMarkerEnd}-->`, 'g');
	let ret = '';
	while (true) {
		let pieces = reg.exec(content);
    console.log(pieces);
		if (!pieces) {
			break;
		}
		let [matched, dataIds] = pieces;
		let raw = pieces.input;
		let raw_before = raw.slice(0, pieces.index);
		let raw_after =  raw.slice( pieces.index + matched.length);
		
		let tryMatchTags = raw_before.match(/(<\w+)\b/g);
		let tryMatchTag;
		let tagStartPos = -1;
		if (tryMatchTags) {
			tryMatchTag = tryMatchTags[tryMatchTags.length - 1];
			tagStartPos = raw_before.lastIndexOf(tryMatchTag);
		}
		if (tagStartPos >= 0) {
			tagStartPos = tagStartPos + tryMatchTag.length;
			raw_before = raw_before.slice(0, tagStartPos) + ` _bind_data=${dataIds}  ` +  raw_before.slice(tagStartPos);
		}

		ret += raw_before;
		content = raw_after;
		reg.lastIndex = 0;
	}
	ret += content;
	return ret;
}

/*
*处理语法标签 空格+@标示*/
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
  if (true === str[isProxySymbol]) {
    return '';
  } 
  if ('object' === typeof str) {
    if (true === str[isDataSymbol]) {
      str = str.value;
    } else {
      return `<pre>${JSON.stringify(str, null, 2)}</pre>`;
    }

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

