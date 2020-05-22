import { wrapperData } from './data.js';
import { 
  processTag, parseTag, 
  delegateEvents, 
  htmlEscape, 
  processHtmlDataId, markDataIdInHtml, affectsToStr
} from './html.js';
import { debounce } from './util.js';
import { isProxySymbol } from './data.js';

let bindedEvents = {};



export function define(tagName, custormOptioins) {
  class BaseElement extends HTMLElement {
    static get name() {
      return tagName;
    }

    constructor() {
      super();

			let clonedOptions = {};
			['property', 'method'].map( name => {
				clonedOptions[name] = custormOptioins[name] || {};
			});
		
			let element = this;
			Object.keys(custormOptioins.property).forEach(propName => {
				if (element.hasAttribute(propName)) {
					custormOptioins.property[propName] = element.getAttribute(propName);
				}
			});
			

      var shadow = this.attachShadow( { mode: 'closed' } );
      let wrapper = document.createElement('template');

			//变动频繁 需要做下防抖
			clonedOptions.property = wrapperData(clonedOptions.property, function({prop, newValue, oldValue, dataRoot, dataId}) {
				console.log(prop, newValue, oldValue, dataRoot, dataId);
				//数据变动了
				shadow.innerHTML = '';
				debounce(doRender)();
			});

			function doRender() { 
				wrapper.innerHTML = custormOptioins.render(clonedOptions);

				shadow.appendChild(wrapper.content);
				//复制事件全局堆栈到内部堆栈， 清空全局堆栈
				let bindedEventsStack = Object.assign(bindedEvents);
				bindedEvents = {};

				//事件委托
				delegateEvents(shadow, bindedEventsStack, clonedOptions);
			}
			doRender();
    }

    connectedCallback() {
      console.log('mounted');
    }

    disconnectedCallback() {
      console.log('unmounted');
    }

  }

	window.customElements.define(tagName, BaseElement);
}

/*
 * */
function makeAffectsToStr(affects) {
  return affects.join('-');
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
		if (argShouldAppend && argValue[isProxySymbol]) {
			argShouldAppend = false;	
		}
		if (argShouldAppend) {
			if (Array.isArray(argValue)) {
				argValue.forEach(item => result.push(item));
			} else {
				//获取数据id绑定到页面上
				let affects = markDataIdInHtml(argValue.affects);
				if (affects) {
					result.push(affects);
				}

				if (argShouldEncode) {
					argValue = htmlEscape(argValue);
				}
				result.push(argValue);
			}
		}
	});
	result.push(raw.slice(-1)[0]);

	let content = result.join('');
	//绑定数据节点id
	content = processHtmlDataId(content);
	
	return content;
}
