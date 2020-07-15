var layoutStaffGroup = function(spacing, renderer, debug, staffGroup) {
	var epsilon = 0.0000001; // Fudging for inexactness of floating point math.
	var spacingunits = 0; // number of times we will have ended up using the spacing distance (as opposed to fixed width distances)
	var minspace = 1000; // a big number to start off with - used to find out what the smallest space between two notes is -- GD 2014.1.7

	var x = getLeftEdgeOfStaff(renderer, staffGroup.getTextSize, staffGroup.voices, staffGroup.brace, staffGroup.bracket);
	staffGroup.startx=x;
	var i;

	var currentduration = 0;
	if (debug) console.log("init layout", spacing);
	for (i=0;i<staffGroup.voices.length;i++) {
		staffGroup.voices[i].beginLayout(x);
	}

	var spacingunit = 0; // number of spacingunits coming from the previously laid out element to this one
	while (!staffGroup.finished()) {
		// find first duration level to be laid out among candidates across voices
		currentduration= null; // candidate smallest duration level
		for (i=0;i<staffGroup.voices.length;i++) {
			if (!staffGroup.voices[i].layoutEnded() && (!currentduration || staffGroup.voices[i].getDurationIndex()<currentduration))
				currentduration=staffGroup.voices[i].getDurationIndex();
		}


		// isolate voices at current duration level
		var currentvoices = [];
		var othervoices = [];
		for (i=0;i<staffGroup.voices.length;i++) {
			var durationIndex = staffGroup.voices[i].getDurationIndex();
			// PER: Because of the inexactness of JS floating point math, we just get close.
			if (durationIndex - currentduration > epsilon) {
				othervoices.push(staffGroup.voices[i]);
				//console.log("out: voice ",i);
			} else {
				currentvoices.push(staffGroup.voices[i]);
				//if (debug) console.log("in: voice ",i);
			}
		}

		// among the current duration level find the one which needs starting furthest right
		spacingunit = 0; // number of spacingunits coming from the previously laid out element to this one
		var spacingduration = 0;
		for (i=0;i<currentvoices.length;i++) {
			//console.log("greatest spacing unit", x, currentvoices[i].getNextX(), currentvoices[i].getSpacingUnits(), currentvoices[i].spacingduration);
			if (currentvoices[i].getNextX()>x) {
				x=currentvoices[i].getNextX();
				spacingunit=currentvoices[i].getSpacingUnits();
				spacingduration = currentvoices[i].spacingduration;
			}
		}
		spacingunits+=spacingunit;
		minspace = Math.min(minspace,spacingunit);
		if (debug) console.log("currentduration: ",currentduration, spacingunits, minspace);

		for (i=0;i<currentvoices.length;i++) {
			var voicechildx = currentvoices[i].layoutOneItem(x,spacing);
			var dx = voicechildx-x;
			if (dx>0) {
				x = voicechildx; //update x
				for (var j=0;j<i;j++) { // shift over all previously laid out elements
					currentvoices[j].shiftRight(dx);
				}
			}
		}

		// remove the value of already counted spacing units in other voices (e.g. if a voice had planned to use up 5 spacing units but is not in line to be laid out at this duration level - where we've used 2 spacing units - then we must use up 3 spacing units, not 5)
		for (i=0;i<othervoices.length;i++) {
			othervoices[i].spacingduration-=spacingduration;
			othervoices[i].updateNextX(x,spacing); // adjust other voices expectations
		}

		// update indexes of currently laid out elems
		for (i=0;i<currentvoices.length;i++) {
			var voice = currentvoices[i];
			voice.updateIndices();
		}
	} // finished laying out


	// find the greatest remaining x as a base for the width
	for (i=0;i<staffGroup.voices.length;i++) {
		if (staffGroup.voices[i].getNextX()>x) {
			x=staffGroup.voices[i].getNextX();
			spacingunit=staffGroup.voices[i].getSpacingUnits();
		}
	}
	//console.log("greatest remaining",spacingunit,x);
	spacingunits+=spacingunit;
	staffGroup.w = x;

	for (i=0;i<staffGroup.voices.length;i++) {
		staffGroup.voices[i].w=staffGroup.w;
	}
	return { spacingUnits: spacingunits, minSpace: minspace };
};

function getLeftEdgeOfStaff(renderer, getTextSize, voices, brace, bracket) {
	var x = renderer.padding.left;

	// find out how much space will be taken up by voice headers
	var voiceheaderw = 0;
	var i;
	var size;
	for (i=0;i<voices.length;i++) {
		if(voices[i].header) {
			size = getTextSize.calc(voices[i].header, 'voicefont', '');
			voiceheaderw = Math.max(voiceheaderw,size.width);
		}
	}
	if (brace) {
		for (i = 0; i < brace.length; i++) {
			if (brace[i].header) {
				size = getTextSize.calc(brace[i].header, 'voicefont', '');
				voiceheaderw = Math.max(voiceheaderw,size.width);
			}
		}
	}
	if (bracket) {
		for (i = 0; i < bracket.length; i++) {
			if (bracket[i].header) {
				size = getTextSize.calc(bracket[i].header, 'voicefont', '');
				voiceheaderw = Math.max(voiceheaderw,size.width);
			}
		}
	}
	if (voiceheaderw) {
		// Give enough spacing to the right - we use the width of an A for the amount of spacing.
		var sizeW = getTextSize.calc("A", 'voicefont', '');
		voiceheaderw += sizeW.width;
	}
	x += voiceheaderw;

	var ofs = 0;
	ofs = setBraceLocation(brace, x, ofs);
	ofs = setBraceLocation(bracket, x, ofs);
	return x + ofs;
}

function setBraceLocation(brace, x, ofs) {
	if (brace) {
		for (var i = 0; i < brace.length; i++) {
			brace[i].setLocation(x);
			ofs = Math.max(ofs, brace[i].getWidth());
		}
	}
	return ofs;
}

module.exports = layoutStaffGroup;
