# MiniElement 

超小的web component runtime, 无需预编译,需要现代浏览器

## Getting Started

无需安装任何依赖，在components目录下编写组件代码，页面引入即可 

```
<user-card email="john@a<b>c.com">
	<span slot="list-icon" class="slot">&copy</span>
</user-card>
<script src="./components/card.js" type="module"></script>
```

### 支持特性  

1. 函数式web component声明
2. 数据字段读取容错
3. 数据驱动局部刷新
4. slot列表循环

### API 
如何编写一个组件


编写/components/demo.js

```
import { 
	Public, //声明公共
	Value,  //因为数据model被代理了，使用该方法获得真实值
	define, //定义组件
	html    //模版解析
} from '../src/lib.js';

var demo  = {
	property: {
		[Public('name')]: null, 
		action: 'Hello' 
	},
	method: {
		act: function({evt, property}) {
			property.action = 'Bye';
		},
		[Public('test')]: function() {
			alert('test');
		} 
	},
	render: ({property,slots, method}) => {
		return html`<h1 @click=${method.act}>
				${property.action}, ${Value(property.name)}
				${slots.line}
		</h1>`;
	}
}
define('me-demo', demo);

```

页面html

```
<me-demo  name="Kevin">
	<p slot="line">________</p>
</me-demo>
<script src="./components/demo.js" type="module"></script>
```




