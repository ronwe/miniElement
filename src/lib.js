import { 
  uuid,
  debounce, 
  Detect
} from './util.js';

import { 
  wrapperData,
  startRecordAffects,
  stopRecordAffects
} from './data.js';

import { 
  processTag, parseTag, 
  delegateEvents, 
  htmlEscape, 
  updatingProperty,
  processHtmlDataId, markDataIdInHtml, affectsToStr
} from './html.js';

import { 
  isDataSymbol,
  isHackSymbol,
  isProxySymbol, 
  isSlotSymbol,
  isMethodSymbol 
} from './symbols.js';

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
      for (let methodName of Object.keys(clonedOptions.method)) {
        clonedOptions.method[methodName][isMethodSymbol] = true;
      }
		
			let element = this;
			Object.keys(custormOptioins.property).forEach(propName => {
				if (element.hasAttribute(propName)) {
					custormOptioins.property[propName] = element.getAttribute(propName);
				}
			});
      clonedOptions.slots = {};
      Array.from(element.querySelectorAll('[slot]')).forEach( slot => {
        let slotName = slot.getAttribute('slot');
        function copySlot()  {
          let clonedSlot = slot.cloneNode(true);
          let clonedSlotName = slotName + '-cp' +  uuid(); 
          clonedSlot.setAttribute('slot', clonedSlotName);
          clonedSlot.setAttribute('iscopyslot', true);
          element.appendChild(clonedSlot);

          return `<slot name=${clonedSlotName}></slot>`; 
        }
        copySlot[isSlotSymbol] = true;
        clonedOptions.slots[slotName] =  copySlot;
      });
			

      var shadow = this.attachShadow( { mode: 'closed' } );
      let template = document.createElement('template');

			//变动频繁 需要做下防抖
			clonedOptions.property = wrapperData(
        clonedOptions.property, 
        updatingProperty({
          shadow,
          getHtml: function () {
            return custormOptioins.render(clonedOptions); 
          },
          updated: function() {
            clearUnUsedCopySlots();
            updateBindedEvents();
          }
        })
      );

      //清除无用slot 
      function clearUnUsedCopySlots() {
        let copySlots = element.querySelectorAll('[slot]'); 
        Array.from(copySlots).forEach( slot => {
          let slotName = slot.getAttribute('slot');
          if (slot.getAttribute('iscopyslot') !== 'true') {
            return;
          }
          let slotInNew = shadow.querySelector(`slot[name="${slotName}"]`);
          if (slotInNew) {
            return;
          }
          element.removeChild(slot);
        });

      }

      function updateBindedEvents() {
				//复制事件全局堆栈到内部堆栈， 清空全局堆栈
				let bindedEventsStack = Object.assign(bindedEvents);
				bindedEvents = {};

				//事件委托
				delegateEvents(shadow, bindedEventsStack, clonedOptions);
      }

			function doRender() { 
				template.innerHTML = custormOptioins.render(clonedOptions);
				shadow.appendChild(template.content);

        updateBindedEvents();
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

    //绑定事件
		if (parsedTag && Detect.isMethod(argValue)) {
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
    if (undefined === argValue) {
      argShouldAppend = false;
    }
		
		result.push(str);

    function appendAffectsToResult(affects) {
      if (affects) {
        let affectsStr = markDataIdInHtml(affects);
        if (affectsStr) {
          result.push(affectsStr)
        }
      }
    }

		if (argShouldAppend) {
      if (argValue[isProxySymbol]) {
			  argShouldAppend = false;	
      } else if (Detect.isFunction(argValue) && Detect.isSlot(argValue)) {
        argValue = argValue();

      } else if (Detect.isFunction(argValue) && !Detect.isMethod(argValue)) {

        let cellectingAffects = false;
        if (true === argValue[isHackSymbol]) {
          appendAffectsToResult(argValue.affects);
        } else {
          cellectingAffects = true;
          startRecordAffects();
        }
        argValue = argValue({});
        if (cellectingAffects) {
          cellectingAffects = false;
          let affects = stopRecordAffects();
          affects.forEach(appendAffectsToResult);
        }
       // stopRecordAffects();
      }
		}

		if (argShouldAppend) {
			if (Detect.isArray(argValue)) {
				argValue.forEach(item => result.push(item));
			} else {
				//获取数据id绑定到页面上
        appendAffectsToResult(argValue.affects);

				if (argShouldEncode) {
//					argValue = htmlEscape(argValue);
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
