import { 
  uuid,
  debounce
} from './util.js';

import { 
  copySlotAttr,
  dataMarkerJoin,
  dataMarkerAny,
  isProxySymbol, 
  isDataSymbol, 
  fnSymbol 
} from './symbols.js';


/*
* 支持哪些事件绑定
*/
const EventNames = Object.assign({
}, 
...['click', 'change'].map( i => ({[i]: i})));


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
let dataAttrName  = '_bind_data';

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

      raw_before = raw_before.slice(0, tagStartPos) + ` ${dataAttrName}="${dataMarkerAny}${dataIds}${dataMarkerAny}"  ` +  raw_before.slice(tagStartPos);
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
 * 绑定所有事件类型委托*/
function bindAllDeletgate(root, handler) {
  Object.keys(EventNames).forEach( eventName => {
    root.addEventListener(eventName, handler);
  });
}
/*
 *处理clone的slot
 * */

export function delegateSlotEvents(rootElement) {
  function slotEventHandler(evt) {
    let element = evt.target;
    let refSlotName = element.getAttribute(copySlotAttr); 
    let slotName = element.getAttribute('slot'); 
    let realSlot;
    if (refSlotName && slotName && slotName.indexOf(refSlotName) === 0 ) {
      realSlot = rootElement.querySelector(`[slot="${refSlotName}"]`);
      evt.stopPropagation();
      evt.preventDefault();
    }
    if (realSlot) {
      //redispatch event on original slot elment
      let newEvt = new  evt.constructor(evt.type, evt);
      realSlot.dispatchEvent(newEvt);
    }
  };

  bindAllDeletgate(rootElement, slotEventHandler);
}
/*
 * 绑定事件委托
 */
export function delegateEvents(root, eventsStack, options) {
  function eventHandler(evt) {
    evt.stopPropagation();
    evt.preventDefault();
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
    eventsStack[id].call(element, Object.assign({evt}, options));
  }
  bindAllDeletgate(root, eventHandler);
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

/*
 * 记录变化id，更新dom
 */
export function updatingProperty({shadow, updated, getHtml, domShouldUpdate}) {
  let propertyStack = [];
  return function({dataId, dataNew}) {
    if (!propertyStack.some(([id]) => id=== dataId)) {
      propertyStack.push([dataId, dataNew]);
    }
    debounce(() => {
      if (domShouldUpdate && !domShouldUpdate()) {
        return;
      }
      let changedProperty = propertyStack.slice();
      propertyStack.length = 0;

      //子节点的dataId更长 先处理
      changedProperty.sort( (prev, cur) => cur[0].length - prev[0].length);


      let template = document.createElement('template');
      let newHtml = getHtml();
      template.innerHTML = newHtml;

      changedProperty.forEach(([dataId, dataNew]) => {
        let xPath = `[${dataAttrName}*="${dataMarkerAny}${dataId}${dataMarkerAny}"]`;
        let oldDoms =  shadow.querySelectorAll(xPath);
        oldDoms.forEach( oldDom => {
          let dataAttr = oldDom.getAttribute(dataAttrName);
          let newDom = template.content.querySelector(`[${dataAttrName}="${dataAttr}"]`);
          if (newDom ) {
            //比对新老dom，将老节点替换回去
            let childrensKeep = [];
            if (dataNew > 0 || dataNew < 0) {
              let childPath = `[${dataAttrName}*="${dataId}${dataMarkerAny}"]`;
              let childrensOld = Array.from(oldDom.querySelectorAll(childPath));

              let childrensNew = Array.from(newDom.querySelectorAll(childPath));
              childrensOld.forEach( child => {
                let dataAttr = child.getAttribute(dataAttrName);
                let childNew = newDom.querySelector(`[${dataAttrName}="${dataAttr}"]`);
                if (childNew && childNew !== child) {
                  childrensKeep.push([dataAttr, child, childNew]);
                }
              });

            }
            childrensKeep.forEach( item => {
              let [dataAttr, child, childNew] = item;
              childNew.replaceWith(child.cloneNode(true));
            });
            oldDom.replaceWith(newDom.cloneNode(true));
          } else if (!newDom) {
            oldDom.parentNode.removeChild(oldDom);
          }
        });
      });
      if (updated) {
        updated();
      }

    })();
  }
}
