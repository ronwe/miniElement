/*
* 支持哪些事件绑定
*/
let bindedEvents = {};
const EventNames = {
	'click': 'click'
};

function delegateEvents(root, eventsStack, options) {
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

export function define(tagName, custormOptioins) {
  class BaseElement extends HTMLElement {
    static get name() {
      return tagName;
    }

    constructor() {
      super();
			let optionsCloned = {};
			['property', 'method'].map( name => {
				optionsCloned[name] = custormOptioins[name] || {};
			});
      var shadow = this.attachShadow( { mode: 'closed' } );
      
      let wrapper = document.createElement('template');
      wrapper.innerHTML = custormOptioins.render(optionsCloned);

      shadow.appendChild(wrapper.content);
			
			//复制事件全局堆栈到内部堆栈， 清空全局堆栈
			let bindedEventsStack = Object.assign(bindedEvents);
			bindedEvents = {};

			//事件委托
			delegateEvents(shadow, bindedEventsStack, optionsCloned);
    }

    connectedCallback() {
      console.log(2222);
    }

    disconnectedCallback() {
    }

  }

	window.customElements.define(tagName, BaseElement);
}


function parseTag(raw, index) {
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
function processTag(orginTagContent, value, bindedEvents) {
	console.log('>>>', orginTagContent,' //',  value);
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

let fnSymbol = Symbol('bid');
let uuidPreix = 0;
function uuid() {
	uuidPreix++;
	if (uuidPreix >= 1000) {
		uuidPreix = 0;
	}
	let id = (+new Date).toString(36);
	return ('00' + uuidPreix).slice(-3) + id;

}
function setBindedIdByFn(bindedEvents, fn) {
	let id = uuid();
	fn[fnSymbol] = id;
	bindedEvents[id] = fn;
	return id;
}
function getBindedIdByFn(fn) {
	return  fn[fnSymbol];
}

function htmlEscape(str) {
	return isNaN(str)? str.toString()
		.replace(/&/g, '&amp;') 
		.replace(/>/g, '&gt;')
		.replace(/</g, '&lt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#39;')
		.replace(/`/g, '&#96;') 
		: str.toString();
}

export function html(strings, ...args) {
	let raw = strings.raw;
	let result = [];
	args.forEach( (argValue, i) => {
		let str = raw[i];
		let tag;
		let parsedTag =  parseTag(raw, i);
		let argShouldAppend = true;
		let argShouldEncode = true;
		if (parsedTag) {
			[str, tag] = parsedTag;
			if (tag) {
				argShouldAppend = false;
				let decoration,  bindId;
				[tag, decoration,  bindId] = processTag(tag, argValue, bindedEvents);
				str += ` _bind_${tag}=${bindId} `;
			} else {
				argShouldEncode = false;
				
			}
		}
		

		result.push(str);
		if (argShouldAppend) {
			if (Array.isArray(argValue)) {
				argValue.forEach(item => result.push(item));
			} else {
				if (argShouldEncode) {
					argValue = htmlEscape(argValue);
				}
				result.push(argValue);
			}
		}
	});
	result.push(raw.slice(-1)[0]);
	return result.join('');
}
