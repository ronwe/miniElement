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
    ul: [
      1,
      2,
      3
    ]
	},
	method: {
		testClick: function(evt, {event,property}) {
			property.name = 'jack';
      //property.ul = [
      //  4,
      //  5
      //];
      property.ul[0] = 4;

		}
	},
  onUnMount: function(root) {
    console.log('unmount', root); 
  },
	render: ({property,slots, method}) => {
		return html`
		<style></style>

		<div class="container">
			<p class="name" @click=${method.testClick}> ${property.name} </p>
      <form>
      <ul>
        $${property.ul.map( li => {
          return html `<li>${li}<input value="${li}"/></li>`;
        })}
      </ul>
      </form>
		</div>`

	}
}

define('user-card', userCard);
