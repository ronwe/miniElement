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
  delegateSlotEvents,
  htmlEscape, 
  updatingProperty,
  processHtmlDataId, markDataIdInHtml, affectsToStr
} from './html.js';

import { 
  isDataSymbol,
  isHackSymbol,
  isProxySymbol, 
  isSlotSymbol,
  isMethodSymbol,
	publicPropertyPrefix,
  copySlotAttr
} from './symbols.js';

import {
	watchAttrChange,
	updatingAttr
} from './attr.js';

import {
	registEventHandler,
	registPublicMethods,
	dispatchEvents
} from './public.js';


let bindedEvents = {};


export function Public(name) {
	return publicPropertyPrefix + name;
}

export function define(tagName, custormOptioins) {
	let publicAttrs = [];
	let publicMethods = [];

  class BaseElement extends HTMLElement {
    static get name() {
      return tagName;
    }

    constructor() {
      super();

      let clonedOptions = {
				property: {},
				method: {},
				slots: {},
				event: {}
			};

      let element = this;
			let render = custormOptioins.render;
			let publicPropertyPrefixLen = publicPropertyPrefix.length;

			//注册emit on方法
			registEventHandler(element, clonedOptions.event);
			//引用method
      for (let methodName of Object.keys(custormOptioins.method)) {
				let isPublicMethod = false;
				let originMethodName = methodName;
				if (methodName.startsWith(publicPropertyPrefix)) {
					isPublicMethod = true;
					methodName = methodName.slice(publicPropertyPrefixLen);
					publicMethods.push(methodName);
				}

				clonedOptions.method[methodName] = custormOptioins.method[originMethodName];
        clonedOptions.method[methodName][isMethodSymbol] = true;
      }
			//注册公共方法
			registPublicMethods(element, publicMethods, clonedOptions.method);


			//复制property
      Object.keys(custormOptioins.property).forEach(propName => {
				let propValue = custormOptioins.property[propName];
				let isPublicAttr = false;
				if (propName.startsWith(publicPropertyPrefix)) {
					isPublicAttr = true;
					propName = propName.slice(publicPropertyPrefixLen);
				}
				clonedOptions.property[propName] = propValue;

        if (isPublicAttr && element.hasAttribute(propName)) {
					publicAttrs.push(propName);
          clonedOptions.property[propName] = element.getAttribute(propName);
        }
      });

			//slot影子方法
      Array.from(element.querySelectorAll('[slot]')).forEach( slot => {
        let slotName = slot.getAttribute('slot');
        if (clonedOptions.slots[slotName]) {
          throw new Error(`slot ${slotName} dumplicate`);
        }
        function copySlot()  {
          let clonedSlot = slot.cloneNode(true);
          let clonedSlotName = slotName + '-cp' +  uuid(); 
          clonedSlot.setAttribute('slot', clonedSlotName);
          clonedSlot.setAttribute(copySlotAttr, slotName);
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
            return render(clonedOptions); 
          },
          updated: function() {
            clearUnUsedCopySlots();
            updateBindedEvents();
          }
        }),
				updatingAttr(
					element, 
					publicAttrs,
					clonedOptions.property	
				)
      );

      //清除无用slot 
      function clearUnUsedCopySlots() {
        let copySlots = element.querySelectorAll('[slot]'); 
        Array.from(copySlots).forEach( slot => {
          let slotName = slot.getAttribute('slot');
          if (!slot.getAttribute(copySlotAttr) ) {
            return;
          }
          let slotInNew = shadow.querySelector(`slot[name="${slotName}"]`);
          if (slotInNew) {
            return;
          }
          element.removeChild(slot);
        });

      }
      

      //更新绑定事件
      function updateBindedEvents() {
        //复制事件全局堆栈到内部堆栈， 清空全局堆栈
        let bindedEventsStack = Object.assign(bindedEvents);
        bindedEvents = {};

        //事件委托
        delegateEvents(shadow, bindedEventsStack, clonedOptions);
      }

			//绑定属性变化
			watchAttrChange(element, publicAttrs, clonedOptions.property);


      function doRender() { 
        template.innerHTML = render(clonedOptions);
        shadow.appendChild(template.content);

        updateBindedEvents();
      }

      doRender();
      delegateSlotEvents(element);
    }

    connectedCallback() {
			dispatchEvents(this, 'mounted');
    }

    disconnectedCallback() {
			dispatchEvents(this, 'unmounted');
    }

  }

  window.customElements.define(tagName, BaseElement);

	return {
		publicAttrs,
		publicMethods
	}
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
        argShouldEncode = false;

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
      }
    }

    if (argShouldAppend) {
      if (Detect.isArray(argValue)) {
        argValue.forEach(item => result.push(item));
      } else {
        //获取数据id绑定到页面上
        appendAffectsToResult(argValue.affects);

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
