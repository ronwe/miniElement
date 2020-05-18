import { define, html } from './lib.js';

var userCard  = {
	property: {
		name: '<jo>hn',
		email: 'john@a<b>c.com',
		list: [
			{name: '<i>'},
			{name: 'hello'},
			{name: 'world'}
		]
	},
	method: {
		testClick: function(...args) {
			console.log(123, this, args);
		}
	},
	render: ({property, method}) => {
		return html`
		<style></style>

		<div class="container">
			<p class="name" @click=${method.testClick}> ${property.name}</p>
			<p class="email"> @${property.email}</p>
			<ul>
				${property.list.map( (book) => {
						return html`<li @click=${method.testClick}>${book.name}</li>`;
				})}
			</ul>
		</div>`
		
	}
}
define('user-card', userCard);
