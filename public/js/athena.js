//************** Resin Profile Functions  */

$("#DwEnableSimple").change(function () {
  if ($(this).is(":checked")) {
    $("#WaitBeforePrintSimple").val(0).prop("disabled", true);
	$("#SupportWaitBeforePrintSimple").val(0).prop("disabled", true);
  } else {
    $("#WaitBeforePrintSimple").prop("disabled", false);
	$("#SupportWaitBeforePrintSimple").prop("disabled", false);
  }
});

$("#setup2").submit(function(){
	$("#CdEnableSimple").prop("checked", true);
	$("#PdEnableSimple").prop("checked", true);
	$("#RlEnableSimple").prop("checked", true);
	$("#DwEnableSimple").prop("checked", true);
});

$("#CdEnableSimple").change(function (){
	cdEnable = $("#CdEnableSimple");
	if(cdEnable.is(':checked')){
		cdEnable.prop('value', "0");
	}else{
		cdEnable.prop('value', "1");
	}
		
});

$("#PdEnableSimple").change(function (){
	pdEnable = $("#PdEnableSimple");
	if(pdEnable.is(':checked')){
		pdEnable.prop('value', "0");
	}else{
		pdEnable.prop('value', "1");
	}
		
});

$("#RlEnableSimple").change(function (){
	rlEnable = $("#RlEnableSimple");
	if(rlEnable.is(':checked')){
		rlEnable.prop('value', "0");
	}else{
		rlEnable.prop('value', "1");
	}
		
});

$("#DwEnableSimple").change(function (){
	dwEnable = $("#DwEnableSimple");
	if(dwEnable.is(':checked')){
		dwEnable.prop('value', "0");
	}else{
		dwEnable.prop('value', "1");
	}
		
});

$(document).ready(function() {

currentUrl = window.location.href
resinTitle = $("#Title").val()

if ( resinTitle && resinTitle.startsWith("[AFP]") ){
	
	if ( currentUrl.includes("clone") ){
		resinTitle = resinTitle.substring(6)
		$("#Title").val(resinTitle)
		$("#Title").trigger('change');
		
		$("#TitleSimple").val(resinTitle)
		$("#TitleSimple").trigger('change');
	}else{
		$("#setup-profile :input").prop("disabled", true);
		$("#setup-profile2 :input").prop("disabled", true);
		$(".setting-cat").prop("disabled", false);
	}
}




});

// Support Page Helpers

$("#SupportSubmitButton").click(function(){
	
	data = {
	 email: $("#SupportEmailField").val(),
	 name: $("#SupportNameField").val(),
	 text: $("#SupportTextField").val(),
	};

	$("#SupportEmailField").val("");
	$("#SupportNameField").val("");
	$("#SupportTextField").val("");

	let submission = window.btoa(unescape(encodeURIComponent(JSON.stringify(data))));
	
	$('#support_notification').modal({backdrop: 'static', keyboard: false})  
	$('#support_notification').modal('show');	
	
	$.ajax(
	{ 
	url: '/gcode', 
	headers: { 'Content-Type': 'application/x-www-form-urlencoded' } ,
	method: 'POST',
	data: new URLSearchParams({
			  	'gcode':  '[[Exec  /home/pi/athena-debug-submission.sh "'+submission+'"]]'
		}).toString(),
	success: function( result ) {
		setTimeout(function() { $('#support_notification').modal('hide'); }, 5000); 
	},
	error: function( result ){
		$('#support_notification').modal('hide');	
	}
		  
	});
});


$("#BtnToggleHeater").click(function(){
	$.ajax({
	  url: "/json/db/machine.json",
	  success: function( result ) {
		const obj = JSON.parse(result);
		
		if(obj["CustomValues"]["HeaterEnable"]){
		
			if(obj["CustomValues"]["HeaterEnable"] === "0"){
				obj["CustomValues"]["HeaterEnable"] = "1";
				$("#BtnToggleHeater").html("Enable Heater");

			}else{
				obj["CustomValues"]["HeaterEnable"] = "0";
				$("#BtnToggleHeater").html("Disable Heater");
			}
		}else{
			obj["CustomValues"]["HeaterEnable"] = "0";
			$("#BtnToggleHeater").html("Disable Heater");
		}			

		var formData = new FormData();
		
		var jsondata = JSON.stringify(obj);

		const file = new Blob([jsondata]);

		formData.append('JsonFile', file, "machine.json");


		$.ajax({
			url: "/setup/import",
			type: "POST",
			data: formData,
			processData : false,
			contentType : false,
		});       	
	
	  }
	});
	
	$("#BtnToggleHeater").html()
	
});



$(document).ready(function(){
	cdEnable = $("#CdEnableSimple");
	if(cdEnable.length){
		if( cdEnable.val() !== "0"){
			cdEnable.prop('checked', false);
			cdEnable.prop('value', "1");
		}else{
			cdEnable.prop('checked', true);
			cdEnable.prop('value', "0");
		}
	}
	
	pdEnable = $("#PdEnableSimple");
	if(pdEnable.length){
		if( pdEnable.val() !== "0"){
			pdEnable.prop('checked', false);
			pdEnable.prop('value', "1");
		}else{
			pdEnable.prop('checked', true);
			pdEnable.prop('value', "0");
		}
	}
	
	rlEnable = $("#RlEnableSimple");
	if(rlEnable.length){
		if( rlEnable.val() !== "0"){
			rlEnable.prop('checked', false);
			rlEnable.prop('value', "1");
		}else{
			rlEnable.prop('checked', true);
			rlEnable.prop('value', "0");
		}
	}
	
	dwEnable = $("#DwEnableSimple");
	if(dwEnable.length){
		if( dwEnable.val() !== "0"){
			dwEnable.prop('checked', false);
			dwEnable.prop('value', "1");
		}else{
			dwEnable.prop('checked', true);
			dwEnable.prop('value', "0");
			$("#WaitBeforePrintSimple").val(0).prop("disabled", true);
			$("#SupportWaitBeforePrintSimple").val(0).prop("disabled", true);
		}
	}
} );

$("#UvPwmValuePercentSimple").change(function () {
  //clamp value
  if (this.value > 100) this.value = 100;
  if (this.value < 1) this.value = 1;
  var percentValue = parseFloat(this.value);
  if (!isNaN(percentValue)) {
    var actualValue = percentValue / 100;
    document.getElementById("UvPwmValueSimple").value = actualValue.toFixed(2);
  }
});

//This is used to adjust any values just for display
document.addEventListener("DOMContentLoaded", function () {
  var UvPwmComp = document.getElementById("UvPwmValuePercentSimple");
  if (UvPwmComp) {
    var scaledValue = UvPwmComp.value * 100;
    UvPwmComp.value = scaledValue.toFixed(0);
  }
});

//************** Calibrations Functions  */

var movement = 1000; // Default movement value is 1 mm

function moveZAxis(direction) {
  console.log(`/z-axis/move/${direction}/micron/${movement}`);
  $.ajax({ url: `/z-axis/move/${direction}/micron/${movement}`, type: "GET", dataType: "json" });
}

function updateMovementButtons() {
  $(".btn-movement").removeClass("btn-movement-active"); // Remove active class from all buttons
  $("#btnMove" + movement).addClass("btn-movement-active"); // Add active class to the selected button
}

$("#btnUp").click(function () {
  moveZAxis("up");
});

$("#btnDown").click(function () {
  moveZAxis("down");
});

$("#btnMove100").click(function () {
  movement = 100;
  updateMovementButtons();
});

$("#btnMove1000").click(function () {
  movement = 1000;
  updateMovementButtons();
});

$("#btnMove10000").click(function () {
  movement = 10000;
  updateMovementButtons();
});

$("#btnMove100000").click(function () {
  movement = 100000;
  updateMovementButtons();
});

$("#btnStop").click(function () {
  console.log(`/printer/force-stop`);
  $.ajax({ url: `/printer/force-stop`, type: "GET", dataType: "json" });
});

$("#btnMoveHome").click(function () {
  console.log(`/z-axis/calibrate`);
  $.ajax({ url: `/z-axis/calibrate`, type: "GET", dataType: "json" });
});

$("#btnMovePark").click(function () {
  console.log(`/z-axis/top`);
  $.ajax({ url: `/z-axis/top`, type: "GET", dataType: "json" });
});

$("#btnMoveBottom").click(function () {
  console.log(`/z-axis/bottom`);
  $.ajax({ url: `/z-axis/bottom`, type: "GET", dataType: "json" });
});


//************** Update page Functions  */

var channel = "";
var image_version = "";
var printer_type= "";
var version_str = "";

$.ajax({
  url: "/static/channel",
  success: function( result ) {
	channel = result;
    $( "#channel" ).html( "Current Software Channel: "+result );
	update_changelog();
  },
  error: function( result ){
	channel = "stable";
	$( "#channel" ).html( "Current Software Channel: "+channel );
	update_changelog();
  }
});

$.ajax({
  url: "/static/printer_type",
  success: function( result ) {
	printer_type = result;
    $( "#printer_type" ).html( "Printer Type: "+result );
	update_changelog();
  }
});

$.ajax({
  url: "/static/image_version",
  success: function( result ) {
	image_version = result;
    $( "#image_version" ).html( "Image Version: "+result );
	parts = image_version.split('+');
	version_str = parts[1];
	$( "#version_str" ).html( "Upgrade from Version: "+parts[1] );
	$("#athena-version-str").html(parts[1]);
	update_changelog();
  }
});

function update_changelog(){

	if( printer_type !== "" && image_version !== "" && channel !== "" ){

	$.ajax({
	  url: "https://olymp.concepts3d.eu/api/changelog?printer_type="+printer_type+"&channel="+channel+"&current_version="+version_str,
	  success: function( result ) {
		$( "#changelog-display" ).html( result );
	  },
	  error: function( result){
	  	console.error('Error: ${result}');
	  }
	
	});
	
	}
}

function changeUpdateChannel(channel){
	try {     
			const response = fetch('/gcode', {
			  method: 'post',
			   headers:{
				'Content-Type': 'application/x-www-form-urlencoded'
			  }, 
      		  body: new URLSearchParams({
			  	'gcode':  '[[Exec echo "'+channel+'" > /home/pi/channel]]'
			  })
		  });
			console.log('Completed!', response);
		  } catch(err) {
			console.error('Error: ${err}');
		  }
}



$(document).ready(function() {
    $("#btn-update").click(function(){
        try {
			var i = 1;
			var counterBack = setInterval(function(){
			i++;
			if(i<100){
				$('#theBar').width(i+"%");
				$('#theBar').html(i+"%");
			} else {
			   clearTimeout(counterBack);
			   location.reload(true);
			}

			}, 2000);
						
			$('#update_notification').modal({backdrop: 'static', keyboard: false})  
			$('#update_notification').modal('show');			
			const response = fetch('/gcode', {
			  method: 'post',
			   headers:{
				'Content-Type': 'application/x-www-form-urlencoded'
			  }, 
      		  body: new URLSearchParams({
			  	'gcode':  "[[Exec /home/pi/athena-start-update.sh]]"
			  })
		  });
			console.log('Completed!', response);
		  } catch(err) {
			console.error('Error: ${err}');
		  }
      }); 
	  
	  $("#btn-lts").click(function(){
		changeUpdateChannel("lts");
	  });
	  
	  $("#btn-stable").click(function(){
		changeUpdateChannel("stable");
	  });
	  
	  $("#btn-beta").click(function(){
	  changeUpdateChannel("beta");
	  });
	  
	  $("#btn-alpha").click(function(){
	  	changeUpdateChannel("alpha");
	  });
	  
	  $("#btn-master").click(function(){
		changeUpdateChannel("master");
	  });
	  
});

$.ajax({
  url: "/json/db/machine.json",
  success: function( result ) {
	const obj = JSON.parse(result);

	$("#WiFiCountryTools").val(obj["WiFiCountry"]);
	
	if(obj["CustomValues"]["HeaterEnable"] && obj["CustomValues"]["HeaterEnable"] == 0){
		$("#BtnToggleHeater").html("Disable Heater")
	}else{
		$("#BtnToggleHeater").html("Enable Heater")
	}
  }
});


var upload_xhr;
var last_progress_ts;
var last_progress_loaded;
var upload_started_ts;

function bytesToStringRep(bytes){
	let loaded_unit = "b";

	if(bytes > 1000000000){
		bytes = Math.floor(bytes/1000000);
		bytes = bytes/1000;
		loaded_unit = "Gb";
	}else if(bytes > 1000000){
		bytes = Math.floor(bytes/1000000);
		loaded_unit = "Mb";
	}else if(bytes > 1000){
		bytes = Math.floor(bytes/1000);
		loaded_unit = "Kb";
	}

	return bytes + " " + loaded_unit;
}

function sToTime(s) {
	var secs = s % 60;
	s = (s - secs) / 60;
	var mins = s % 60;
	var hrs = (s - mins) / 60;

	let str = "";

	if(hrs < 10) str+="0";
	str += hrs;
	str+=":";
	if(mins < 10) str+="0";
	str+=mins;
	str+=":";


	secs = Math.floor(secs);
	if(secs < 10) str+="0";
	str+=secs;

	return str;
}

function progressHandler(e){
	let bar = $("#upload-modal-progress-bar");
	let tex = $("#upload-modal-text");
	let progtex = $("#upload-modal-progress-text");

	let percent = (e.loaded / e.total) *100;

	let loaded_str = bytesToStringRep(e.loaded);
	let total_str = bytesToStringRep(e.total);

	bar.width(percent + "%");

	progtex.html(loaded_str+ " / " + total_str);

	let time_since_last_call = Date.now() - last_progress_ts;
	let upload_amount_since_last_call = e.loaded - last_progress_loaded;

	last_progress_ts = Date.now();
	last_progress_loaded = e.loaded;

	let bytes_per_second = upload_amount_since_last_call / (time_since_last_call / 1000);

	let upload_speed_str = bytesToStringRep(bytes_per_second) + "/s";

	let average_upload_speed = e.loaded / ((Date.now() - upload_started_ts) / 1000);

	let seconds_remaining = (e.total - e.loaded) / average_upload_speed;

	let remaining_time_str = sToTime(seconds_remaining);

	tex.html("Upload Speed: "+upload_speed_str+"</br> Remaining Time: "+remaining_time_str);

	if(e.loaded === e.total){
		tex.html("File is being processed");
		progtex.html("");
	}

	return true;
}

function completeHandler(){
	setTimeout(function(){
		removeUploadProgressModal();
		history.back();
	},10000);
}

function errorHandler(){
	bar = $("#upload-modal-progress-bar");
	tex = $("#upload-modal-text");
	progtex = $("#upload-modal-progress-text");

	tex.html("An error occured during upload");
	progtex.html("");
	bar.width(100 + "%");

}

function abortHandler(){
	removeUploadProgressModal();
}

function abortUpload(){
	upload_xhr.abort();
}

function removeUploadProgressModal(){
	$("#upload-modal").remove()
}

function showUploadProgressModal(){
	msg='<div class="modal fade" id="upload-modal" tabindex="-1" role="dialog" aria-labelledby="modalLabelSmall" aria-hidden="false">'
			+'<div class="modal-dialog">'
				+'<div class="modal-content">'
					+'<div class="modal-header">'
						+'<h5 class="modal-title" id="modalLabelSmall"><center>'
						+'FILE UPLOAD </center></h5>'
					+ '</div>' //end modal header
					+ '<div class="modal-body">'
						+'<div class="progress text-center">'
							+'<div id="upload-modal-progress-bar" class="progress-bar progress-bar-warning progress-bar-striped active" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width: 0">'
							+'</div>'
						+'<span style="color: black" id="upload-modal-progress-text"></span>'
						+'</div>'
		                +'</br>'
						+'<div style="text-align: center">'
						+'<h7 id="upload-modal-text"></h7>'
						+'</div>'
					+ '</div>' //end modal body
					+ '<div class="div-modal-buttons" style="align-content: center">'
						+ '<button type="button" id="btn-uploadmodal-cancel" class="btn-sm btn-danger btn-mod-center">Cancel</button>'
						+'</br>'
					+'</div>' //end modal footer
				+'</div>' //end model content
			+'</div>' //end modal dialog
		+'</div>'; //end modal fade

	$(".navbar").after(msg);

	$('#upload-modal').modal({backdrop: 'static', keyboard: false})
	$('#upload-modal').modal('show');

	upload_started_ts = Date.now();

	$("#btn-uploadmodal-cancel").click(function (){
		abortUpload();
	})
}

$('.upload-disable').submit(function(e) {
	let currentUrl = window.location.href

	if( currentUrl.includes("plate/add")){
		e.preventDefault();

		var formData = new FormData( document.getElementById("plate-upload-form") );

		upload_xhr = new XMLHttpRequest();
		upload_xhr.upload.addEventListener("progress", progressHandler, false);
		upload_xhr.addEventListener("loadend", completeHandler, false);
		upload_xhr.addEventListener("error", errorHandler, false);
		upload_xhr.addEventListener("abort", abortHandler, false);
		upload_xhr.open("POST", "/plate/add");
		showUploadProgressModal();
		upload_xhr.send(formData);

	}else{
		var form = $(this);
		var submitButton = form.find('button[type="submit"]');
		submitButton.prop('disabled', true);
		$(".upload-progress-bar").show();
	}

});