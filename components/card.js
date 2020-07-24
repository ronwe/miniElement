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
      0,
      1,
      2,
      3,
      4,
    ],
    obj: {
      a: 'T' 
    }
	},
  onInit: ({property }) => {
    //console.log(property.ul.indexOf(2));
    //property.name = property.name.replace(property.obj.a, '');
  },
	method: {
		testClick: function(evt, {event,property}) {
			//property.name = 'jack';
      property.ul.splice(1,1 );
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
