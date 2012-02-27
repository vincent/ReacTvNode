
$('.thumbnails li .types .btn').click(function(e){
	e.preventDefault();
	
	var id = $(this).parents('li').filter(':first').attr('id').replace('fiducial_', '');
	
	$.ajax('/action', {
		data: {
			set: $('#active_set').val(),
			fiducial: id,
			toggle_type: $(this).attr('reactv-type')
		},
		success: function(){
			window.location += '&t=' + Math.round(Math.random() * 1000);
		}
	});
	
});