/*
* dom属性变化触发数据变更
*/
export function watchAttrChange(element, attrs, dataRoot) {
  let observer = new MutationObserver(function (mutations, observer) {
    mutations.forEach(function(mutation) {
      let propertyName = mutation.attributeName;
      if (attrs.includes(propertyName)) {
        let properValueNew = element.getAttribute(propertyName);
        if (properValueNew !== dataRoot[propertyName]) {
          dataRoot[propertyName] = element.getAttribute(propertyName);
        }
      }
    });
  });

  observer.observe(element, {
    childList: false,
    characterData: false,
    attributes: true
  });

}

/*
* 更新dom属性*/
export function updatingAttr(element, attrs, propertyRoot) {
  return function({dataRoot, prop, newValue}) {
    if (propertyRoot === dataRoot && attrs.includes(prop)) {
       let attrValueOld =  element.getAttribute(prop);
       if (attrValueOld !== newValue) {
          element.setAttribute(prop, newValue);
       }
    }
  }
}

