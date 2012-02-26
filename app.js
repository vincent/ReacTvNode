var config = {
	sets_directory: __dirname+'/sets'
};

/**************************************************************************/

var exec = require('child_process').exec;
var whiskers = require('whiskers');
var express = require('express');
var jsdom = require('jsdom');
var async = require('async');
var fs = require('fs');

var app = express.createServer();

app.register('.html', whiskers);

app.set('views', __dirname+'/views');

app.configure(function(){
  app.use(express.methodOverride());
  app.use(express.bodyParser());
  app.use(express.logger());
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
		return '<li class="' + (active_set == set ? 'active' : '') + '"><a href="/edit?set=' + set + '">' + set + '</a></li>';
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

/**************************************************************************/
/* index */
app.get('/', function(req, res){
	var C = context(req);
	res.render('index.html', C);
});


/* edit */
app.get('/edit', function(req, res){
	var C = context(req);
	
	var filepath = __dirname + '/sets/' + C.active_set;
	
	fs.readFile(filepath, 'utf8', function(err, contents){
		
		// walk in fiducials as dom
		jsdom.env(contents, [
          'http://127.0.0.1:8888/assets/js/jquery.js'
          ],
          function(errors, window) {

            var xml_fiducials = window.$("map");

            console.log("fiducials: ", xml_fiducials.length);

            // context's fiducials
            var set_fiducials = [];
            
            xml_fiducials.each(function(index, fid){
            	var fid = window.$(fid);
            	
            	fid.id = fid.attr('fiducial');
            	fid.type = fid.attr('type');
                fid.icon = {
            		'vfader':'resize-vertical',
            		'hfader':'resize-horizontal',
            		'knob'  :'refresh'
            	}[fid.type];
            	fid.control = fid.attr('control');

            	/* * /
                console.log("found fiducial: ", {
    				id: fid.id,
    				types: [ fid.type ],
    				control: fid.control
        		});
        		/* */
                
            	if (set_fiducials[fid.id]){
            		set_fiducials[fid.id].types.push(fid.type);
            		set_fiducials[fid.id].icons.push(fid.icon);
            	} else {
            		set_fiducials[fid.id] = {
        				id: fid.id,
        				icons: [ fid.icon ],
        				types: [ fid.type ],
        				control: fid.control
            		};
            	}
            	
            });

            C.set_fiducials = set_fiducials;

            console.log("found fiducials: ", C.set_fiducials);

            res.render('edit.html', C);
		 });
	});
});





// run
app.listen(8888);
console.log('Server running at http://127.0.0.1:8888/');
