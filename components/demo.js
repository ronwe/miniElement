import { 
	Public,
	Value,
	define, 
	html
} from '../src/lib.js';

var userDemo  = {
	property: {
		list: []
	},
	onInit: async  function({property}) {
    property.list = [1, 2];
	},
	onMount: function(root) {
    console.log('>>> mount ', root);		
	},
  onUnMount: function(root) {
    console.log('unmount', root); 
  },
	render: ({property,slots, method}) => {
		return html`

		<div class="container">
			<ul>
				${property.list.map( (i) => {
					return html`<li >${i}</li>`;
				})}
			</ul>
		</div>`

	}
}

define('user-demo', userDemo);
