/*
 * This page is for script after loading HTML.
 */

$(document).ready(function () {
	
	fnDeviceCheck(); //device version Check.
	
});

function fnDeviceCheck(){
	//console.log("fnDeviceCheck called");
	var bodyWidth = $('body').width();
	if (bodyWidth >= 1280) {
		deviceVersion = "pc";
		//console.log("pc!!");

	} else {
		deviceVersion = "mobile";
		//console.log("mobile!!");
	}

}

function printThisPage() {
	window.print();
}

