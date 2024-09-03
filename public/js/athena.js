// Analytics api data endpoints
//
//	LayerHeight = 0
// 	SolidArea = 1
// 	AreaCount =2
// 	LargestArea 3
// 	Speed 4
// 	Cure 5
// 	Pressure 6
// 	TemperatureInside 7
// 	TemperatureOutside 8
// 	LayerTime 9
// 	LiftHeight 10
// 	TemperatureMCU 11
// 	TemperatureInsideTarget 12
// 	TemperatureOutsideTarget 13
// 	TemperatureMCUTarget 14
// 	MCUFanRPM 15
// 	UVFanRPM 16
// 	DynamicWait  17
//
//
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

	const slowLiftSpeed = document.getElementById('SimpleSlowLiftSpeed').value;
	const liftSpeed = document.getElementById('SimpleLiftSpeed').value;
	const liftLayers = document.getElementById('SimpleSlowLiftLayers').value;
	const slowRetractSpeed = document.getElementById('SimpleSlowRetractSpeed').value;
	const retractSpeed = document.getElementById('SimpleRetractSpeed').value;
	const retractLayers = document.getElementById('SimpleSlowRetractLayers').value;


	saveSpeed(slowLiftSpeed, liftSpeed, liftLayers, $("#SimpleDynamicSpeed"))
	saveSpeed(slowRetractSpeed, retractSpeed, retractLayers, $("#SimpleDynamicRetractSpeed"))
});

/**
 * Translation layer for saving the dynamic speed values
 * @param slowSpeed - The value of the slow speed as an integer
 * @param fastSpeed - The value of the fast speed as an integer
 * @param layers - The count of layers to save
 * @param formElement - The Jquery input element from the expert mode form
 */
function saveSpeed(slowSpeed, fastSpeed, layers, formElement) {
	const newConfigTextBlock = `[JS] if ([[LayerNumber]] < ${layers}) {
    output = "${slowSpeed}";
} else {
    output = "${fastSpeed}";
};[/JS]`;

	formElement.prop('value', newConfigTextBlock)
}

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

// Add click event listener to the confirm button on forceStop 
// navigates user to /plates after a forceStop
$("#confirmButton").click(function(){    
    // Save a reference to the current element
    var $this = $(this);
    
    // This setTimeout is just a placeholder to simulate some delay
    setTimeout(function() {
        // Change the href attribute after the delay
        $this.attr("href", "/plates");
        
        // Manually trigger the click event to navigate to the new URL
        $this.trigger("click");
    }, 2000); // Adjust the delay time as needed (in milliseconds)
})

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

	$('.form-control').each(function() {
		var originalValue = $(this).val();
		var step = $(this).attr('step');
		// Check if the original value is a valid number and if step is less than 1
		if (!isNaN(originalValue) && originalValue !== "" && step && parseFloat(step) < 1) {
		var formattedValue = parseFloat(originalValue).toFixed(2);
		$(this).val(formattedValue);
		}
 	 });
  
  	$('.form-control').change(function() {
		var originalValue = $(this).val();
		var step = $(this).attr('step');
		// Check if the original value is a valid number and if step is less than 1
		if (!isNaN(originalValue) && originalValue !== "" && step && parseFloat(step) < 1) {
		var formattedValue = parseFloat(originalValue).toFixed(2);
		$(this).val(formattedValue);
		}
 	 });
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

/**
 * Conversion layer for the dynamic speed code blocks
 * @param dynamicSpeed - The code block from the NanoDLP API
 * @param fastElem - JQuery html input to store the fast speed in
 * @param slowElem - JQuery html input to store the slow speed in
 * @param layersElem - JQuery html input to store the layers in
 */
function convertDynamicSpeed(dynamicSpeed, fastElem, slowElem, layersElem ) {
	const liftSpeedData = decodeHTMLEntities(dynamicSpeed);
	const bottomSpeed = liftSpeedData.match(/< \d+\) {\s*output = "(\d+)";/);
	const fastSpeed = liftSpeedData.match(/else {\s*output = "(\d+)";/);
	const layers = liftSpeedData.match(/LayerNumber\]\] < (\d+)/);

	if (fastSpeed) {
		fastElem.value = fastSpeed[1];
	}
	if (bottomSpeed) {
		slowElem.value = bottomSpeed[1];
	}
	if (layers) {
		layersElem.value = layers[1];
	}
}

/**
 * Acts as a translation layer between expert values from NanoDLP API into simple form values on the Basic Mode page
 * Any form values that need to be translated to simpler values should be handled here
 * @param dynamicLiftSpeed - NanoDLP DynamicSpeed code block
 * @param dynamicRetractSpeed - NanoDLP DynamicRetractSpeed code block
 */
function expertToSimpleElementConversion(dynamicLiftSpeed, dynamicRetractSpeed) {
	convertDynamicSpeed(
		dynamicLiftSpeed,
		document.getElementById('SimpleLiftSpeed'),
		document.getElementById('SimpleSlowLiftSpeed'),
		document.getElementById('SimpleSlowLiftLayers')
	);
	convertDynamicSpeed(
		dynamicRetractSpeed,
		document.getElementById('SimpleRetractSpeed'),
		document.getElementById('SimpleSlowRetractSpeed'),
		document.getElementById('SimpleSlowRetractLayers')
	);
}

/*
	Hack to decode NanoDLP safe values
 */
function decodeHTMLEntities(text) {
	const textArea = document.createElement('textarea');
	textArea.innerHTML = text;
	return textArea.value;
}

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
  $.ajax({ url: `/printer/force-stop`, type: "GET", dataType: "json" });
});

$("#btnMoveHome").click(function () {
  $.ajax({ url: `/z-axis/calibrate`, type: "GET", dataType: "json" });
});

$("#btnMovePark").click(function () {
  $.ajax({ url: `/z-axis/top`, type: "GET", dataType: "json" });
});

$("#btnMoveBottom").click(function () {
  $.ajax({ url: `/z-axis/bottom`, type: "GET", dataType: "json" });
});


//************** Update page Functions  */

var channel = "";
var image_version = "";
var printer_type= "";
var version_str = "";

function update_channel() {
	$.ajax({
		url: "/static/channel",
		success: function (result) {
			channel = result;
			$("#channel").html("Current Software Channel: " + result);
			update_changelog();
		},
		error: function (result) {
			channel = "stable";
			$("#channel").html("Current Software Channel: " + channel);
			update_changelog();
		}
	});
}
function update_printertype() {
	$.ajax({
		url: "/static/printer_type",
		success: function (result) {
			printer_type = result;
			$("#printer_type").html("Printer Type: " + result);
			update_changelog();
		}
	});
}

function update_image_version() {
	$.ajax({
		url: "/static/image_version",
		success: function (result) {
			image_version = result;
			$("#image_version").html("Image Version: " + result);
			parts = image_version.split('+');
			version_str = parts[1];
			$("#version_str").html("Upgrade from Version: " + parts[1]);
			$("#athena-version-str").html(parts[1]);
			update_changelog();
		}
	});
}

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

const url_progress = window.location.origin + ":8080/athena_progress.txt";
const url_message = window.location.origin + ":8080/athena_message.txt";

function open_update_modal(){
	var i = 1;

	let update_status_helper = "";

	let ajax_error_cnt = 0;

	$('#theBar').width(5+"%");
	$('#theBar').html(5+"%");
	$('#progress-message').html("Launching updater");

	var counterBack = setInterval(function()
	{
		$.ajax({
			url: url_progress,
			success: function( result ) {
				if(update_status_helper === ""){
					update_status_helper = "running";
				}
				result = result.replace(/[\r\n]+/gm, "") + "%";

				$('#theBar').width(result)
				$('#theBar').html(result);
			},
			error: function( result){
				if(update_status_helper === "running"){
					clearTimeout(counterBack);
					$('#update_notification').modal('hide');
					update_image_version();
				}
				ajax_error_cnt++;

				if(ajax_error_cnt >= 20){
					$('#progress-message').html("Connection to the updater seems to have failed, please reload this page");
				}

			}});

		$.ajax({
			url: url_message,
			success: function( result ) {
				$('#progress-message').html(result);
			},

		});

	}, 1000);

	$('#update_notification').modal({backdrop: 'static', keyboard: false})
	$('#update_notification').modal('show');
}

function check_if_update_running(){
	if (!$('#update_notification').is(':visible')) {

		$.ajax({
			url: url_progress,
			success: function( result ) {
				open_update_modal();
			}
		});

	}
}

$(document).ready(function() {
	update_channel();
	update_printertype();
	update_image_version();

	check_if_update_running();

    $("#btn-update").click(function(){
        try {
			open_update_modal();
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
		$("#btn-uploadmodal-cancel").prop('hidden', true);
		setInterval(processingHandler, 500)
	}

	return true;
}

function processingHandler() {
	$.get("/api/v1/progress/copy", function (response) {
		const responsePercentage = response + "%";

		$("#upload-modal-progress-bar").width(responsePercentage);
		$("#upload-modal-progress-text").html(responsePercentage);

		if(response === 100){
			completeHandler();
		}
	});
}
function completeHandler(){
	setTimeout(() => {
		removeUploadProgressModal();
		window.location.replace("/plates");
	}, 1000);
}

function errorHandler(){
	bar = $("#upload-modal-progress-bar");
	tex = $("#upload-modal-text");
	progtex = $("#upload-modal-progress-text");

	tex.html("An error occurred during upload");
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
		//upload_xhr.addEventListener("loadend", completeHandler, false);
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

$(function() {
	fetch_resin_target();
	setInterval(function(){fetch_resin_target();}, 10000);

	fetch_resin_actual();
	setInterval(function(){fetch_resin_actual();}, 10000);

});

function fetch_resin_target(){
		$.ajax({
			url:'/analytic/value/12',
			type: 'GET',
			timeout: 2000
		}).done(function(data) {
			var msg = "";
			if (data === null) return;
			$('.navbar-resin-temp').show()

			if(data == 0){
				$("#navbar-resin-target-text").text("Heater is Off");
			}else{
				$("#navbar-resin-target-text").text("Target :"+data+"°C");
			}

		});
}

function fetch_resin_actual(){
	$.ajax({
		url:'/analytic/value/7',
		type: 'GET',
		timeout: 2000
	}).done(function(data) {
		if (data === 0){
			$('.navbar-resin-temp').hide();
		}else {
			$('.navbar-resin-temp').show();
			$("#navbar-resin-temp-text").text(data + "");
		}
	});
}


$(function() {
	setInterval(function(){display_notification_athena();}, 2000);
});

display_notification_athena.prev_msg='';
display_notification_athena.prev_data='';

function display_notification_athena(){
	$.ajax({
		url:'/notification',
		type: 'GET',
		timeout: 2000
	}).done(function(data){
		var msg="";
		if (data===null) return;

		if(data.length > 0){
			$.each(data,function(k,v){

				if( display_notification_athena.prev_data === "" || v['Timestamp'] >= display_notification_athena.prev_data['Timestamp']){

					var date = new Date();
					date.setTime(v['Timestamp']*1000);

					var hour = date.getHours();
					var min = date.getMinutes();
					var sec = date.getSeconds();

					hour = (hour < 10 ? "0" : "") + hour;
					min = (min < 10 ? "0" : "") + min;
					sec = (sec < 10 ? "0" : "") + sec;

					var str = hour + ":" + min + ":" + sec;

					msg='<div class="modal fade" id="notificationModal" tabindex="-1" role="dialog" aria-labelledby="modalLabelSmall" aria-hidden="false">'
						+'<div class="modal-dialog">'
						+'<div class="modal-content">'
						+'<div class="modal-header">'
						+'<h4 class="modal-title" id="modalLabelSmall"><center>'+v["Type"].toUpperCase()+'</center></h4>'
						+'</div>' //end modal header
						+'<div class="modal-body">'
						+'<center>'+str+' - '+v["Text"]+'</center>'
						+'</br>'
						+'</div>' //end modal body
						+'<div class="div-modal-buttons">';
					if(v["Type"] !== "error") {
						msg += '<button type="button" id="btn-modal-continue" class="btn btn-info btn-mod-l"> Continue Anyways</button>';
						msg += '<button type="button" id="btn-modal-cancel" class="btn btn-danger btn-mod-r"> Cancel Print</button>'
					}else{
						msg += '<button type="button" id="btn-modal-cancel" class="btn btn-danger btn-mod-center"> Cancel Print</button>'
					}
					msg+='</div>' //end modal footer
						+'</div>' //end model content
						+'</div>' //end modal dialog
						+'</div>'; //end modal fade

					if(v["Type"] === "error"){
						$('#btn-modal-continue').hide();
					}
					display_notification_athena.prev_data=v;


				}
			});

			if (msg===display_notification_athena.prev_msg) return;
			display_notification_athena.prev_msg=msg;
			$("#notificationModal").remove();
			$(".navbar").after(msg);



			$('#btn-modal-continue').click(function(){
				try {
					const response = fetch('/notification/disable/'+display_notification_athena.prev_data["Timestamp"], {
						method: 'get'
					});
					const response2 = fetch('/printer/unpause', {
						method: 'get'
					});
					console.log('Completed!', response);
				} catch(err) {
					console.error('Error: ${err}');
				}
				$('#notificationModal').modal('hide');

			});
			$('#btn-modal-cancel').click(function(){
				try {
					const response = fetch('/notification/disable/'+display_notification_athena.prev_data["Timestamp"], {
						method: 'get'
					});
					const response2 = fetch('/api/v1/printer/printer/stop', {
						method: 'get'
					});
					console.log('Completed!', response);
				} catch(err) {
					console.error('Error: ${err}');
				}
				$('#notificationModal').modal('hide');
			});

			$('#notificationModal').modal({backdrop: 'static', keyboard: false})
			$('#notificationModal').modal('show');


		}else{
			msg="";
			$('#notificationModal').modal('hide');
			$("#notificationModal").remove();
		}
	});
}
