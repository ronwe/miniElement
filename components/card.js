import { 
	Public,
	Value,
	define, 
	html
} from '../src/lib.js';

var userCard  = {
	event: [
		'custom'
	],
	property: {
		[Public('name')]: `somebody's name`,
		[Public('email')]: '',
		desc: {
			pubtime: 1919
		},
		list: [
			{name: '<i>', checked: true},
			{name: 'hello'},
			{name: 'world', checked: false}
		]
	},
	method: {
		testClick: function({evt, property}) {
			//console.log(this, evt );
			property.name = 'jack';
			let i = 10;
			while (i--) {
				//root.property.list.push({name: 'new item ' + i});
			}
			property.list[2].name = 'updated';
			property.list[0].checked = false;
			event.custom.emit({abc:123});

		},
		[Public('testPublic')]: function(evt) {
			console.log(evt);
		}
	},
	onInit: async  function(root) {
    console.log('>>> init', root);		
	},
	onMount: function(root) {
    console.log('>>> mount ', root);		
	},
  onUnMount: function(root) {
    console.log('unmount', root); 
  },
	render: ({property,slots, method}) => {
		return html`
		<style></style>

		<div class="container">
			<p class="name" @click=${method.testClick}> ${property.name} </p>
			<p class="email"> <input value=" @${property.email}"/>  </p>
			<p class="desc"> 描述: ${`[${property.desc.pubtime}]${property.name}`} </p>
			<p class="desc"> 
				描述: 
							<slot name="list-icon"></slot>
				${property.info.desc.desc} 
			</p>
			<ul>
				${property.list.map( (book) => {
					return html`<li @click=${method.testClick}>${book.name}
							 <input type=checkbox ${Value.checked(book.checked)} />
							<slot name="list-icon"></slot>
							${slots['list-icon']}
						</li>`;
				})}
			</ul>
		</div>`

	}
}

let instance = define('user-card', userCard);
console.log(instance);
