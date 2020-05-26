import { define, html } from './lib.js';

var userCard  = {
	property: {
		name: "somebody's name",
		email: '',
		desc: {
			pubtime: 1919
		},
		list: [
			{name: '<i>'},
			{name: 'hello'},
			{name: 'world'}
		]
	},
	method: {
		testClick: function(evt, root) {
			//console.log(this, evt );
			//root.property.name = 'jack';
			root.property.list.splice(0, 1);
      /*
			if (root.property.list.length < 4) {
				root.property.list.push({name: 'new item'});
			} else {
			}
      */
		}
	},
	render: ({property, method}) => {
		return html`
		<style></style>

		<div class="container">
			<p class="name" @click=${method.testClick}> ${property.name} </p>
			<p class="email"> <input value=" @${property.email}"/>  </p>
			<p class="desc"> 描述: ${`[${property.desc.pubtime}]${property.name}`} </p>
			<p class="desc"> 描述: ${property.info.desc.desc} </p>
			<ul>
				${property.list.map( (book) => {
						return html`<li @click=${method.testClick}>${book.name}<input type=checkbox /></li>`;
				})}
			</ul>
		</div>`
		
	}
}
define('user-card', userCard);
