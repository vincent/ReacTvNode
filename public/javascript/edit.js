
$('.thumbnails li .types .btn').click(function(e){
	e.preventDefault();
	
	var id = $(this).parents('li').filter(':first').attr('id').replace('fiducial_', '');
	var active_set = $('#active_set').val();
	
	$.ajax('/action', {
		data: {
			set: $('#active_set').val(),
			fiducial: id,
			toggle_type: $(this).attr('reactv-type'),
			toggle_control: prompt('Which MIDI control is it ?', $(this).attr('reactv-control'))
		},
		success: function(){
			$('<form id="editform" action="/edit" method="get"><input name="set" value="'+active_set+'"/></form>').submit();
		}
	});
	
});