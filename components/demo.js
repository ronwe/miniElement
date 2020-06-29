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
  method: {
    select: function({evt, action}) {
      action.select(evt.target.value);
    }
  },
  action: {
    select: function(selected) {
      console.log(selected, this);
    }
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
			<select @change=${method.select}>
        <option/>
				${property.list.map( (i) => {
					return html`<option > ${i}</option>`;
				})}
			</select>
		</div>`

	}
}

define('user-demo', userDemo);
