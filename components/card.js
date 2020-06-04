import { 
	Public,
	Value,
	define, 
	html
} from '../src/lib.js';

var userCard  = {
	events: [
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
		testClick: function(evt, root) {
			//console.log(this, evt );
			root.property.name = 'jack';
			let i = 10;
			while (i--) {
				//root.property.list.push({name: 'new item ' + i});
			}
			root.property.list[2].name = 'updated';
			root.property.list[0].checked = false;
			root.event.custom.emit({abc:123});

		},
		[Public('testPublic')]: function(evt) {
			console.log(evt);
		}
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
