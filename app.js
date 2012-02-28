var config = {
	sets_directory: __dirname+'/sets'
};

var all_icons = {
		'vfader':'resize-vertical',
		'hfader':'resize-horizontal',
		'knob'  :'refresh',
		'note'  :'play-circle'
	};
var all_types = {
		'resize-vertical'  :'vfader',
		'resize-horizontal':'hfader',
		'refresh'          :'knob',
		'play-circle'      :'note'
	};

/**************************************************************************/

if (!Object['values']){
	Object.defineProperty(Object.prototype, 'values', {
	    enumerable: false,
	    value: function(of) {
	    	return Object.keys(of).map(function(key) {
	    	  return of[key];
			});
	    }
	});
}

if (!Object['exclude']){
	Object.defineProperty(Object.prototype, 'exclude', {
	    enumerable: false,
	    value: function(from) {
	      var newArray = [];
	      this.forEach(function(key){
	    	 if (from.indexOf(key) == -1){
	    	   newArray.push(key);
	    	 }
	      });
	      return newArray;
	    }
	});
}

/**************************************************************************/

var exec = require('child_process').exec;
var whiskers = require('whiskers');
var express = require('express');
var jsdom = require('jsdom');
var async = require('async');
var fs = require('fs');
var R = require('./node_modules/reactvision.js');
var spawn = require('child_process').spawn;

var app = express.createServer();

app.register('.html', whiskers);

app.set('views', __dirname+'/views');

app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  //app.use(express.logger());
  app.use('/assets', express.static(__dirname + '/public/assets'));
  app.use('/javascript', express.static(__dirname + '/public/javascript'));
  app.use('/fiducials', express.static(__dirname + '/public/fiducials'));
  app.use('/modules', express.static(__dirname + '/node_modules'));
});

/**************************************************************************/

/**
 * sets_list_html
 * @returns {String} html list
 */
function sets_list_html(sets, active_set){
	return sets.map(function(set){
		return '<li class="' + (active_set == set ? 'active' : '') + '">'
				+ '<a class="set_name" href="/edit?set=' + set + '">' + set + '</a>'
				+ '<a class="set_duplicate" id="duplicate_'+ set +'" href="#"><i class="icon-tags"></i></a>'
			 + '</li>';
	});
}

/**
 * context
 * @returns {Object} context
 */
function context(req){
	
	// user sets
	var user_sets = fs.readdirSync(config.sets_directory);
	
	// active set
	var active_set = req.param('set', false);
	
	// all sets
	var user_sets_html = sets_list_html(user_sets, active_set);

	return {
		user_sets: user_sets,
		user_sets_html: user_sets_html.join(''),
		active_set: active_set
	};
};

/**
 * readMidiConfigFile
 */
function readMidiConfigFile(set, callback){
	var filepath = __dirname + '/sets/' + set;
	
	fs.readFile(filepath, 'utf8', function(err, contents){
		
		// parse file contents
		var midiParser = new R.MidiConfigFileParser();
		var set_fiducials = midiParser.run(contents, {
			all_icons: all_icons,
			all_types: all_types,
			default_types: {
				'vfader': { enabled: false, type: 'vfader', icon: 'resize-vertical'   },
				'hfader': { enabled: false, type: 'hfader', icon: 'resize-horizontal' },
				'knob'  : { enabled: false, type: 'knob',   icon: 'refresh'           },
				'note'  : { enabled: false, type: 'note',   icon: 'play-circle'       }
			}
		});

    	callback(set_fiducials);
	});
}

/**
 * writeMidiConfigFile
 */
function writeMidiConfigFile(set, set_fiducials, callback){
	// header
	var contents = '																		\n\
<?xml version="1.0" encoding="UTF-8" ?>												\n\
																							\n\
	<!-- 																					\n\
	reacTIVision MIDI mapping configuration file											\n\
	using MIDI each dimension needs to be mapped to an individual control number.			\n\
	possible dimensions are: x-position, y-position and rotation angle						\n\
	additionaly the fiducial presence can be mapped to note on/off events.					\n\
																							\n\
	each mapping tag contains at least the following attributes:							\n\
	fiducial:	the ID number of the fiducial tag											\n\
	type: 		the control type															\n\
				hfader=xpos, vfader=ypos, knob=angle, note=presence							\n\
	control:	the control number (for the hfader, vfader & knob types)					\n\
	note:		the note number (for the note type)											\n\
																							\n\
	optional attributes:																	\n\
	channel:	the MIDI channel (defaults to 0)											\n\
	min:		minimum range (defaults to 0)												\n\
	max:		maximum range (defaults to 1)												\n\
																							\n\
	the min/max attribute allow the selection of a subregion in the desired dimension.		\n\
	for example min=0.1 and max 0.9 will ignore 10% on each side of the image				\n\
	for the knob type max=1 will map to a full rotation from 0 to 127 in MIDI values.		\n\
	-->																						\n\
																							\n\
	<midi device="1">																		\n\
';
	
	Object.values(set_fiducials).forEach(function(fiducial){

		fiducial.controls.forEach(function(control){
			if (control.enabled) {
				if (control.type == 'note'){
					contents += '		<map fiducial="'+fiducial.id+'" type="'+control.type+'" note="'+control.control+'" />						\n\
';
					
				} else {
					contents += '		<map fiducial="'+fiducial.id+'" type="'+control.type+'" control="'+control.control+'" min="0.1" max="0.9"/>	\n\
';
				}
			}
		});
	});
	
	// footer
	contents += '\n\
	</midi>';
	
	var filepath = __dirname + '/sets/' + set;
	fs.writeFile(filepath, contents, 'utf8', function(err){
		console.log('wrote file [', filepath, ']');
		//console.log(set_fiducials);
		//console.log(contents);
		callback();
	});
}

/**************************************************************************/

/* index */
app.get('/', function(req, res){
	var C = context(req);
	res.render('index.html', C);
});

/* edit */
app.get('/edit', function(req, res){
	var C = context(req);
	
	readMidiConfigFile(C.active_set, function(set_fiducials){
		C.set_fiducials = Object.values(set_fiducials);
		C.all_icons = Object.values(all_icons);

        //console.log("CONTEXT: ", C);
        res.render('edit.html', C);
	});
});

/* action */
app.get('/action', function(req, res){
	var C = context(req);
	
	// toggle a fiducial type
	if (req.param('toggle_type', false) && req.param('fiducial', false)){
		var fid_id = req.param('fiducial');
		var toggle_type_icon = req.param('toggle_type');
		var toggle_type = all_types[req.param('toggle_type')];
		
		readMidiConfigFile(C.active_set, function(set_fiducials){
			
			if (set_fiducials[fid_id]){
				console.log(
						'toogle ', toggle_type_icon, ' of ',
						' fiducial #', fid_id, 
						' current types are ', set_fiducials[fid_id].types,
						' current icons are ', set_fiducials[fid_id].icons);
				
				// fiducial already has this type
        		if (set_fiducials[fid_id].icons.indexOf(toggle_type_icon) > -1){
        			// remove it
    				// console.log('remove type [', toggle_type, ' (', toggle_type_icon, ')] of fiducial #', fid_id);
    				
    				Object.keys(set_fiducials[fid_id].controls).forEach(function(key){
              		  if (set_fiducials[fid_id].controls[key].type == toggle_type){
                  		set_fiducials[fid_id].controls[key].enabled = false;
              		  }
              		});
        		}
        		// fiducial does not have this type
        		else {
        			// add it
    				// console.log('add type [', toggle_type, ' (', toggle_type_icon, ')] to fiducial #', fid_id);
            		
            		Object.keys(set_fiducials[fid_id].controls).forEach(function(key){
            		  if (set_fiducials[fid_id].controls[key].type == toggle_type){
            			set_fiducials[fid_id].controls[key] = { enabled: true, control: 9, type: toggle_type };
            		  }
            		});
        		}
        	}

        	// write the file
			// console.log('update set [', C.active_set, ']');
        	writeMidiConfigFile(C.active_set, set_fiducials, function(){
        		res.end();
        	});
		});
		
	}

	// stop
	if (req.param('stop', false)){
		if (os.platform() == 'windows'){
			spawn('TASKKILL /F /IM reactvision.exe');
		} else {
			spawn('killall -9 reactvision');
		}
	}

	// start
	if (req.param('stop', false)){
		if (os.platform() == 'windows'){
			spawn('reactvision.exe');
		} else {
			spawn('reactvision');
		}
	}

	// restart
	if (req.param('restart', false)){
		if (os.platform() == 'windows'){
			spawn('TASKKILL /F /IM reactvision.exe');
			spawn('reactvision.exe');
		} else {
			spawn('killall -9 reactvision');
			spawn('reactvision');
		}
	}

	// other possible actions ..
	else if (false){
		
	}
	
	// no valid action found
	else {
		res.end('0');
	}
});





// run
app.listen(8888);
console.log('Server running at http://127.0.0.1:8888/');
